/* eslint-env node */

/**
 * Main Program for server.
 */
const deps = [
	'underscore',
	'repl',
	'fs',
	'optimist',
	'events',
	'socket.io',
	'http',
	'nodemailer',
	'express',
	'express-negotiate',
	'method-override',
	'cookie-parser',
	'errorhandler',
	'basic-auth-connect',
	'icebox',
	'server/Game',
	'server/Player',
	'server/FileDB',
	'scrabble/Tile',
	'scrabble/Square',
	'scrabble/Board',
	'scrabble/Rack',
	'scrabble/LetterBag'];

define("server/main", deps, (_, Repl, Fs, Optimist, Events, SocketIO, Http, NodeMailer, Express, negotiate, MethodOverride, CookieParser, ErrorHandler, BasicAuth, Icebox, Game, Player, DB, Tile, Square, Board, Rack, LetterBag) => {

	function mainProgram(__dirname) {
		// Live games; map from game key to Game
		const games = {};

		// Command-line arguments
		const argv = Optimist
			  .options('d', {
				  alias: 'database',
				  'default': 'data.db'
			  })
			  .options('c', {
				  alias: 'config'
			  })
			  .argv;

		const config = JSON.parse(Fs.readFileSync(argv.config || 'config.json'));
		console.log('config', config);

		// Database
		let db;
		
		/**
		 * Load the game from the DB, if not already in server memory
		 * @param key game key
		 */
		async function loadGame(key) {
			if (games[key])
				return games[key];
			
			const game = await db.get(key);
			if (!game)
				return null;

			Events.EventEmitter.call(game);
			game.connections = [];
			Object.defineProperty(
				// makes connections non-persistent
				game, 'connections', { enumerable: false });
			games[key] = game;

			return game;
		}
		
		/**
		 * Handler for /games; returns a list of active games
		 */
		async function listGames(req, res) {
			const games = await db.all();
			const loads = games.filter(game => !game.endMessage)
				  .map(async gamey => {
					  const game = await loadGame(gamey.key)
					  return {
						  key: game.key,
						  language: game.language,
						  players: game.players.map(player => {
							  return {
								  name: player.name,
								  connected: player.isConnected,
								  email: player.email,
								  key: player.key,
								  hasTurn: player == game.players[game.whosTurn]};
						  })};
				  });
			Promise.all(loads)
			.then(gs => res.send(gs));
		}

		async function sendGameReminders(req, res) {
			const games = await db.all()
			games.map(async game => {
				game = await db.get(game.key);
				if (!game)
					return null;
				if (!game.endMessage) {
					const ageInDays = (new Date() - game.lastActivity()) / 60000 / 60 / 24;
					if (ageInDays > 14) {
						console.log('Game timed out:', game.players.map(({ name }) => name));
						game.endMessage = { reason: 'timed out' };
						game.save();
					} else {
						const player = game.players[game.whosTurn];
						player.sendInvitation(
							`It is your turn in your Scrabble game with ${game.joinProse(player)}`,
							config);
					}
				}
			});
			res.send("Reminder emails sent");
		}

		// Handle construction of a game given up to 6 players. Name is required
		// for each player. Optional email may be sent.
		function newGame(req, res) {
			console.log("/newgame");
			const players = [];
			for (let x = 1; x <= 6; x++) {
				const name = req.body[`name${x}`];
				const email = req.body[`email${x}`];
				if (name) {
					const player = new Player(name, email);
					players.push(player);
					console.log(`${player} params ${req.params}`);
				}
			}
			
			if (players.length < 2)
				throw Error('at least two players must participate in a game');

			console.log(`game has ${players.length} players`);
			const game = new Game(req.body.language || 'English', players);

			// Save the game when everything has been initialised
			game.ready()
			.then(() => {
				game.save();

				game.sendInvitations(config);

				// Redirect back to control panel
				res.redirect("/client/games.html");
			});
		}

		/**
		 * Handler for /game/:gameKey/:playerKey, player joining a game.
		 * Sets a cookie in the response with the player key so future
		 * requests can be handled correctly.
		 */
		async function enterGame(req, res) {
			const gameKey = req.params.gameKey;
			const game = await loadGame(gameKey);
			if (!game)
				throw Error(`Game ${gameKey} does not exist`);

			console.log(`Player ${req.params.playerKey} Entering ${gameKey}`); 
			res.cookie(gameKey, req.params.playerKey,
					   { path: '/', maxAge: (30 * 24 * 60 * 60 * 1000) });
			res.redirect(`/game/${gameKey}`);
		}

		/**
		 * Handle for GET /game/:gameKey
		 * If the accept: in the request is asking for 'application/json'
		 * then respond with JSON, for HTML with the HTML page for the game.
		 * TODO: this is clunky
		 */
		async function getGame(req, res) {
			const gameKey = req.params.gameKey;
			const game = await loadGame(gameKey);
			if (!game)
				throw Error(`Game ${gameKey} does not exist`);

			// Use express-negotiate to negotiate the response type
			req.negotiate({
				'application/json': function () {
					const response = {
						board: game.board,
						turns: game.turns,
						language: game.language,
						whosTurn: game.whosTurn,
						remainingTileCounts: game.remainingTileCounts(),
						legalLetters: game.letterBag.legalLetters,
						players: []
					}
					const playerKey = req.cookies[game.key];
					for (let i = 0; i < game.players.length; i++) {
						const player = game.players[i];
						response.players.push({
							name: player.name,
							score: player.score,
							rack: (player.key == playerKey) ? player.rack : null
						});
					}
					if (game.ended())
						response.endMessage = game.endMessage;
					res.send(Icebox.freeze(response));
				},
				'html': () => res.sendFile(`${__dirname}/client/game.html`)
			});
		}

		/**
		 * Handle game command received as an AJAX request
		 * @throw if anything goes wrong
		 */
		async function handleCommand(req, res) {
			const gameKey = req.params.gameKey;
			const game = await loadGame(gameKey);
			
			if (!game)
				throw Error(`Game ${gameKey} does not exist`);

			const playerKey = req.cookies[gameKey];
			const player = game.lookupPlayer(playerKey);
			if (!player)
				throw Error(`invalid player key ${playerKey} for game ${this.key}`);
			const body = Icebox.thaw(req.body);

			console.log(`game ${game.key} player ${player.name} command ${body.command}`, req.body.arguments);

			let tilesAndTurn;
			switch (req.body.command) {

			case 'makeMove':
				game.checkPlayerAndGame(player);
				tilesAndTurn = game.makeMove(player, body.arguments);
				break;

			case 'pass':
				game.checkPlayerAndGame(player);
				tilesAndTurn = game.pass(player);
				break;

			case 'swap':
				game.checkPlayerAndGame(player);
				tilesAndTurn = game.swapTiles(player, body.arguments);
				break;

			case 'challenge':
			case 'takeBack':
				tilesAndTurn = game.challengeOrTakeBackMove(req.body.command, player);
				break;

			case 'newGame':
				game.createFollowonGame(player);
				break;

			default:
				throw Error(`unrecognized command: ${body.command}`);
			}

			if (tilesAndTurn) {
				const tiles = tilesAndTurn[0];
				const turn = tilesAndTurn[1];

				// keep time stamp of turn
				const now = (new Date()).toISOString();
				turn.timestamp = now;

				const result = game.finishTurn(player, tiles, turn);
				res.send(Icebox.freeze(result));
			}
		}

		// Configure email
		if (config.mailTransportConfig) {
			config.smtp = NodeMailer.createTransport(config.mailTransportConfig);
		} else if (process.env.MAILGUN_SMTP_SERVER) {
			config.mailSender = `scrabble@${process.env.MAILGUN_DOMAIN}`;
			config.smtp = NodeMailer.createTransport({
				host: process.env.MAILGUN_SMTP_SERVER,
				port: process.env.MAILGUN_SMTP_PORT,
				secure: false,
				auth: {
					user: process.env.MAILGUN_SMTP_LOGIN,
					pass: process.env.MAILGUN_SMTP_PASSWORD
				}
			});
		} else {
			console.log('email sending not configured');
		}

		
		// Configure express server
		//const app = Express();
		//const server = app.listen(process.env.PORT || config.port)
		//const http = Http.Server(app);
		//const io = SocketIO(server.port);

		const app = Express();
		const http = Http.Server(app);
		const io = SocketIO(http)

		http.listen(config.port);

		app.use(MethodOverride());
		app.use(Express.urlencoded({ extended: true }));
		app.use(Express.json());
		app.use(CookieParser());

		// Grab all static files relative to the project root
		console.log(`static files from ${__dirname}`);
		app.use(Express.static(__dirname));
		
		app.use(ErrorHandler({
			dumpExceptions: true,
			showStack: true
		}));

		process.on('unhandledRejection', function(reason) {
			console.log("Unhandled Rejection:", reason.stack);
		});

		// Configure database
		db = new DB(argv.database);
		Game.setDatabase(db);
		db.on('load', () => console.log('database loaded'));

		// Register classes that are to be serialised
		db.registerObject(Tile);
		db.registerObject(Square);
		db.registerObject(Board);
		db.registerObject(Rack);
		db.registerObject(LetterBag);
		db.registerObject(Game);
		db.registerObject(Player);

		// TODO: use OAuth
		const gameListAuth = BasicAuth(function(username, password) {
			if (config.gameListLogin) {
				return username == config.gameListLogin.username
				&& password == config.gameListLogin.password;
			} else {
				return true;
			}
		}, "Enter game list access login");

		// HTML page for main interface
		app.get("/", (req, res) => res.redirect("/client/games.html"));

		// AJAX request to send reminders about active games
		app.post("/send-game-reminders", (req, res) =>
				 sendGameReminders(req, res));

		// AJAX request for available games
		app.get("/games",
				config.gameListLogin ? gameListAuth : (req, res, next) => next(),
				(req, res) => listGames(req, res)
			   );

		// Construct a new game
		app.post("/newgame", newGame);

		app.get("/config", (req, res) =>
				// To get here, had to know port and baseUrl, so no point in resending.
				res.send({ language: config.defaultLanguage }));
		
		// Handler for player joining a game
		app.get("/game/:gameKey/:playerKey", enterGame);

		// Request handler for game interface
		app.get("/game/:gameKey", getGame);
		
		// Request handler for game command
		app.post("/game/:gameKey", handleCommand);

		io.sockets.on('connection', socket => {
			// The server socket only listens to two messages, 'join' and 'message'
			// However it emits a lot more, in 'Game.js'
			socket
			.on('join', async params => {
				
				// Request to join a game.
				const game = await loadGame(params.gameKey);
				if (!game) {
					console.log(`game ${params.gameKey} not found`);
					return;
				}
				game.newConnection(socket, params.playerKey);
				socket.game = game;
			})
			
			.on('message', message => {
				// Chat received, simply broadcast it to listeners
				// SMELL: socket doesn't have a game, does it?
				socket.game.notifyListeners('message', message);
			});
		});

		// Start interactive debug. Type javascript to inspect server internals.
		const repl = Repl.start({
			prompt: "debug> ",
			input: process.stdin,
			output: process.stdout
		});

		repl.context.db = db;
		repl.context.Game = Game;
		repl.context.DB = DB;
		repl.context.config = config;
	}

	return mainProgram;
});
