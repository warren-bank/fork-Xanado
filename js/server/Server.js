/* eslint-env node */

/**
 * Main Program for server.
 */
const deps = [
	'underscore',
	'repl',
	'fs-extra',
	'node-getopt',
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
	'scrabble/LetterBag',
	'scrabble/Dictionary'];

define("server/Server", deps, (_, Repl, Fs, Getopt, Events, SocketIO, Http, NodeMailer, Express, negotiate, MethodOverride, CookieParser, ErrorHandler, BasicAuth, Icebox, Game, Player, DB, Tile, Square, Board, Rack, LetterBag, Dictionary) => {

	// Live games; map from game key to Game
	const games = {};
	// Cache of dictionaries
	const dictionaries = {};

	// Configuration
	let config;
	
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
					  edition: game.edition,
					  dictionary: game.dictionary,
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

	// promise to get a dictionary
	async function getDictionary(dict) {
		if (dictionaries[dict])
			return Promise.resolve(dictionaries[dict]);
		console.log(`Loading dictionary ${dict}`);
		return Fs.readFile(`${config.dirname}/dictionaries/${dict}.dict`)
		.then(dawg => {
			// TODO: alphabet has to come from LetterBag!
			dictionaries[dict] = new Dictionary(dawg, 15, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
			return dictionaries[dict];
		});
	}
	
	// Handle construction of a game given up to 6 players. Name is required
	// for each player. Optional email may be sent.
	function newGame(req, res) {
		console.log(`Constructing new game ${req.body.edition}`);
		
		const players = [];
		for (let x = 1; x <= 6; x++) {
			const name = req.body[`name${x}`];
			const email = req.body[`email${x}`];
			if (name) {
				const player = new Player(name, email);
				players.push(player);
				console.log(player.toString());
			}
		}
		
		if (players.length < 2)
			throw Error('at least two players must participate in a game');

		let dictionary = req.body.dictionary;
		if (dictionary && dictionary != "None") {
			// Trigger asynchronous load, but don't wait
			getDictionary(dictionary);
		} else
			dictionary = null;
		
		console.log(`${players.length} players`);
		const game = new Game(req.body.edition || 'English_Normal', dictionary, players);

		// Save the game when everything has been initialised
		game.ready()
		.then(() => {
			game.save();

			game.sendInvitations(config);

			// Redirect back to control panel
			res.redirect("/client/games.html");
		})
		.catch(e => {
			console.error(`Failed ${e}`);
		});
	}

	// Player has asked for a follow-on from the current game.
	async function followOnGame(req, res) {
		const gameKey = req.params.gameKey;
		const game = await loadGame(gameKey);
		if (!game)
			throw Error(`Game ${gameKey} does not exist`);
		
		const playerKey = req.cookies[gameKey];
		const player = game.lookupPlayer(playerKey);

		game.createFollowonGame(player);
		// Redirect back to control panel
		res.redirect("/client/games.html");
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
	 * Handler for GET /game/:gameKey
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
			'html': () => res.sendFile(`${config.dirname}/client/game.html`)
		});
	}

	/**
	 * Handle game command received as an AJAX request
	 * @throw if anything goes wrong
	 * @return [ tiles ], iceboxed
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

		let result;
		switch (req.body.command) {

		case 'makeMove':
			game.checkTurn(player);
			result = game.makeMove(player, body.arguments);
			break;

		case 'pass':
			game.checkTurn(player);
			result = game.pass('pass', player);
			break;

		case 'swap':
			game.checkTurn(player);
			result = game.swapTiles(player, body.arguments);
			break;

		case 'challenge':
			if (game.dictionary) {
				// Check the last move in the dictionary
				await getDictionary(game.dictionary)
				.then(dict => {
					result = game.challengePreviousMove(player, dict);
				});
			} else {
				// No dictionary, challenge always succeeds
				result = game.undoPreviousMove(req.body.command, player);
			}
			break;
			
		case 'takeBack':
			result = game.undoPreviousMove(req.body.command, player);			
			break;

		default:
			throw Error(`unrecognized command: ${body.command}`);
		}

		let newTiles = result.tiles || [];
		delete result.tiles; // don't want to log these
		game.prepareResult(player, result);
		res.send(Icebox.freeze({ newTiles: newTiles }));
	}
	
	function configureDatabase(database) {
		// Configure database
		db = new DB(database);
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
	}
	
	function runServer(config) {
		// Configure express server
		const app = Express();
		const http = Http.Server(app);
		const io = SocketIO(http)

		http.listen(config.port);

		app.use(MethodOverride());
		app.use(Express.urlencoded({ extended: true }));
		app.use(Express.json());
		app.use(CookieParser());

		// Grab all static files relative to the project root
		console.log(`static files from ${config.dirname}`);
		app.use(Express.static(config.dirname));

		app.use(ErrorHandler({
			dumpExceptions: true,
			showStack: true
		}));
		
		app.use(function(err, req, res, next) {
			if (res.headersSent) {
				return next(err);
			}
			
			return res.status(err.status || 500).render('500');
		});
		
		process.on('unhandledRejection', function(reason) {
			console.log("Unhandled Rejection:", reason, reason.stack);
		});
		
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

		// Create a follow-on game
		app.post("/another/:gameKey", followOnGame);
		
		app.get("/config", (req, res) =>
				// To get here, had to know port and baseUrl, so no point in resending.
				res.send({
					edition: config.defaultEdition,
					editions: config.editions,
					dictionary: config.defaultDictionary,
					dictionaries: config.dictionaries
				}));

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

	function mainProgram(dirname) {
		
		// Command-line arguments
		let cliopt = Getopt.create([
			["h", "help", "Show this help"],
			["c", "config=ARG", "Path to config file (default config.json)"]
		])
			.bindHelp()
			.setHelp("Scrabble server\n[[OPTIONS]]")
			.parseSystem()
			.options;

		Fs.readFile(cliopt.config || 'config.json')
		.then(json => {
			config = JSON.parse(json);
			config.database = config.database || 'data.db';
			config.dirname = dirname;
		})
		.then(() => Fs.readdir(`${config.dirname}/js/scrabble/edition`))
		.then(editions => {
			config.editions = _.filter(editions, e => /\.js$/.test(e)).map(e => e.replace(".js", ""));
		})
		.then(() => Fs.readdir(`${config.dirname}/dictionaries`))
		.then(dicts => {
			config.dictionaries = _.filter(dicts, e => /\.dict$/.test(e)).map(e => e.replace(".dict", ""));;
		})
		.then(() => {
			console.log('config', config);
			
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
			return config;
		})
		.then(config => {
			configureDatabase(config.database);
			runServer(config);
		});
	}

	return mainProgram;
});
