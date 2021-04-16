/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node */

/**
 * Main program for Crossword Game server.
 */
const main_deps = [
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
	'dirty',
	'game/Fridge',
	'game/Game',
	'game/Player',
	'game/Edition',

	"game/findBestPlay"];
//	"game/findBestPlayController"];

define("server/Server", main_deps, (Fs, Getopt, Events, SocketIO, Http, NodeMailer, Express, negotiate, MethodOverride, CookieParser, ErrorHandler, BasicAuth, Dirty, Fridge, Game, Player, Edition, findBestPlay) => {

	// Live games; map from game key to Game
	const games = {};

	// Configuration
	let config;

	// Database
	let database;

	// Status-monitoring sockets (game pages)
	let monitors = [];

	/**
	 * Load the game from the DB, if not already in server memory
	 * @param key game key
	 * @return a Promise to load the Game
	 */
	function loadGame(key) {
		if (games[key])
			return Promise.resolve(games[key]);

		const game = Game.thaw(database.get(key));

		if (!game) {
			console.log(new Error(`Failed to thaw game ${key}`));
			return Promise.reject('error-game-does-not-exist');
		}
		game.saver = saveGame => {
			console.log(`Saving game ${saveGame.key}`);
			return new Promise(resolve => database.set(
				saveGame.key, Fridge.freeze(saveGame), resolve));
		};

		game.connections = [];

		Events.EventEmitter.call(game);

		Object.defineProperty(
			// makes connections non-persistent
			game, 'connections', { enumerable: false });
		games[key] = game;
		console.log(`Loaded game ${game}`);

		if (!game.ended) {
			// May need to trigger computer players
			const fp = game.players[game.whosTurn];
			const what = fp.isRobot ? "robot" : "human";
			console.log(`Next to play is ${what} ${fp}`);
			if (fp.isRobot) {
				// This is done asynchronously
				return fp.autoplay(game)
				.then(result => {
					// updateGameState will cascade next robot player
					game.updateGameState(fp, result);
					return game;
				});
			}
		}

		return Promise.resolve(game);
	}

	/**
	 * Notify monitors (/games pages) that something has changed
	 */
	function updateMonitors() {
		monitors.forEach(socket => {
			socket.emit('update');
		});
	}

	/**
	 * Generic catch for response handlers
	 */
	function trap(e, res) {
		console.log("Trapped", e);
		res.status(500).send(e.toString());
	}

	/**
	 * Handler for GET /games
	 * Sends a list of active games
	 * @return a Promise
	 */
	function handle_games(req, res) {
		const promises = [];
		database.forEach((key, frozenGame) => {
			const game = Game.thaw(frozenGame);
			if (!game || game.ended)
				return;

			promises.push(
				loadGame(game.key)
				.then(game => {
					return {
						key: game.key,
						edition: game.edition,
						dictionary: game.dictionary,
						time_limit: game.time_limit,
						players: game.players.map(player => {
							return {
								name: player.name,
								isRobot: player.isRobot,
								connected: game.isConnected(player),
								key: player.key,
							hasTurn: player == game.players[game.whosTurn]};
						})
					};
				}));
		});

		Promise.all(promises)
		.then(data => res.send(data))
		.catch(e => trap(e, res));
	}

	/**
	 * Handler for GET /locales; sends a list of available locales.
	 * Used when selecting a presentation language for the UI.
	 * @return a Promise
	 */
	function handle_locales(req, res) {
		return Fs.readdir(requirejs.toUrl('i18n'))
		.then(files => {
			res.send(
				files.filter(file => /\.json$/.test(file))
				.map(file => file.replace(".json", "")));
		})
		.catch(e => trap(e, res));
	}

	/**
	 * Handler for /send-game-reminders
	 * Email reminders to next human player in each game
	 */
	function handle_sendGameReminders() {
		database.forEach((key, frozenGame) => {
			const game = Game.thaw(frozenGame);
			game.emailTurnReminder(config);
		});
	}

	/**
	 * Handler for POST /newGame. 
	 * @return a Promise
	 */
	function handle_newGame(req, res) {
		console.log(`Constructing new game ${req.body.edition}`);

		if (req.body.players.length < 2)
			return Promise.reject('error-need-2-players');

		return Edition.load(req.body.edition)
		.then(edition => {

			const players = [];
			let haveHuman = false;
			for (let p of req.body.players) {
				const player = new Player(p.name, edition.rackCount);
				player.isRobot = (p.isRobot == "true");
				if (!player.isRobot) {
					haveHuman = true;
					if (player.email)
						// optional, may be empty
						player.email = p.email;
				}

				players.push(player);
				console.log(player.toString());
			}

			if (!haveHuman)
				throw Error('error-need-human');

			let dictionary = null;
			if (req.body.dictionary
				&& req.body.dictionary != "none") {
				console.log(`\twith dictionary ${req.body.dictionary}`);
				dictionary = req.body.dictionary;
			} else
				console.log("\twith no dictionary");

			let game = new Game(edition.name, players, dictionary);
			game.saver = () => {
				console.log(`Saving game ${game.key}`);
				return new Promise(resolve => database.set(
					game.key, Fridge.freeze(game), resolve));
			};
			game.time_limit = req.body.time_limit || 0;
			if (game.time_limit > 0)
				console.log(`\t${game.time_limit} minute time limit`);
			else
				console.log("\twith no time limit");

			game.load()
			.then(game => {
				console.log(game.toString());

				// Save the game when everything has been initialised
				game.save();

				game.emailInvitations(config);

				// Redirect back to control panel
				res.redirect("/html/games.html");
			});
		})
		.catch(e => trap(e, res));
	}

	/**
	 * Handler for /game/:gameKey/:playerKey, player joining a game.
	 * Sets a cookie in the response with the player key so future
	 * requests can be handled correctly.
	 * @return Promise
	 */
	function handle_enterGame(req, res) {
		const gameKey = req.params.gameKey;
		const playerKey = req.params.playerKey;
		return loadGame(gameKey)
		.then(() => {
			console.log(`Player ${playerKey} Entering ${gameKey}`); 
			res.cookie(gameKey, playerKey, {
				path: '/',
				maxAge: (30 * 24 * 60 * 60 * 1000) // 30 days
			});
			// Redirect to handle_gameGET() for the HTML
			res.redirect(`/game/${gameKey}`);
		})
		.catch(e => trap(e, res));
	}

	/**
	 * Handler for GET /game/:gameKey
	 * If the accept: in the request is asking for 'application/json'
	 * then respond with JSON with the current game state, if it's
	 * asking for HTML with the HTML page for the game.
	 */
	function handle_gameGET(req, res) {
		const gameKey = req.params.gameKey;
		return loadGame(gameKey)
		.then(game => {
			// Use express-negotiate to negotiate the response type
			req.negotiate({
				'application/json': () => res.send(Fridge.freeze(game)),
				'html': () => res.sendFile(requirejs.toUrl('html/game.html'))
			});
		})
		.catch(e => trap(e, res));
	}

	/**
	 * Handler for GET /bestPlay
	 * @return Promise
	 */
	function handle_bestPlay(req, res) {
		const gameKey = req.params.gameKey;
		const playerKey = req.params.playerKey;
		return loadGame(gameKey)
		.then(game => game.lookupPlayer(playerKey))
		// Find the best play for the player, given the current board
		// state. Note that it may not be their turn, that's OK, this is debug
		.then(info => findBestPlay(info.game, info.player.rack.tiles()))
		.then(play => res.send(Fridge.freeze(play)))
		.catch(e => trap(e, res));
	}

	/**
	 * Handler for POST /deleteGame
	 */
    function handle_deleteGame(req, res) {
        const gameKey = req.params.gameKey;
        return loadGame(gameKey)
        .then(() => {
            database.rm(gameKey, undefined);
			res.send("OK");
        })
        .catch(e => trap(e, res));
    }

	function handle_anotherGame(req, res) {
        return loadGame(req.params.gameKey)
        .then(game => game.anotherGame())
        .catch(e => trap(e, res));
	}

	/**
	 * Handler for POST /game
	 * Result is always a Turn object, though the actual content
	 * varies according to the command sent.
	 * @return Promise
	 */
	function handle_gamePOST(req, res) {
		const gameKey = req.params.gameKey;
		// Get cookie set by handle_enterGame that identifies the player
		const playerKey = req.cookies[gameKey];
		return loadGame(gameKey)
		.then(game => game.lookupPlayer(playerKey))
		.then(info => {
			const game = info.game;

			if (game.ended)
				return;

			const player = info.player;
			const command = req.body.command;
			const args = req.body.args ? JSON.parse(req.body.args) : null;


			console.log(`COMMAND ${command} player ${player.name} game ${game.key}`, args);

			let promise;
			switch (command) {

			case 'makeMove':
				promise = game.checkTurn(player)
				.then(game => game.makeMove(player, args));
				break;

			case 'pass':
				promise = game.checkTurn(player)
				.then(game => game.pass(player, 'pass'));
				break;

			case 'swap':
				promise = game.checkTurn(player)
				.then(game => game.swap(player, args));
				break;

			case 'challenge':
				// Check the last move in the dictionary
				promise = game.challenge(player);
				break;

			case 'takeBack':
				promise = game.takeBack(player, 'took-back');
				break;

			default:
				// Terminal, no point in translating
				throw Error(`unrecognized command: ${command}`);
			}

			return promise.then(result => {
				game.updateGameState(player, result);
				updateMonitors();
				// Send something for Ui.handleMoveResponse
				// This really only applies to swap and makeMove,
				// as updateGameState sends info for other commands
				res.send(Fridge.freeze(result.newTiles || []));
			});
		})
		.catch(e => trap(e, res));
	}

	function connectDatabase(file) {
		console.log('opening database', file);
		return new Promise(resolve => {
			database = new Dirty(file);
			database.on('load', resolve);
		});
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
		// html, images, css etc
		console.log(`static files from ${requirejs.toUrl('')}`);
		console.log(`database is ${database.path}`);
		app.use(Express.static(requirejs.toUrl('')));

		app.use(ErrorHandler({
			dumpExceptions: true,
			showStack: true
		}));

		app.use((err, req, res, next) => {
			if (res.headersSent) {
				return next(err);
			}

			return res.status(err.status || 500).render('500');
		});

		process.on('unhandledRejection', function(reason) {
			console.log("Command rejected", reason, reason.stack);
		});

		// TODO: use OAuth
		const gameListAuth = BasicAuth((username, password) => {
			if (config.gameListLogin) {
				return username == config.gameListLogin.username
				&& password == config.gameListLogin.password;
			} else {
				return true;
			}
		}, "Enter game list access login");

		// HTML page for main interface
		app.get("/", (req, res) => res.redirect("/html/games.html"));

		// AJAX request to send email reminders about active games
		app.post("/send-game-reminders", () => handle_sendGameReminders());

		// AJAX request for available games
		app.get("/games",
				config.gameListLogin ? gameListAuth : (req, res, next) => next(),
				(req, res) => handle_games(req, res)
			   );

		app.get("/locales",	handle_locales);

		// Construct a new game
		app.post("/newGame", handle_newGame);

        app.post("/deleteGame/:gameKey", handle_deleteGame);

		app.post("/anotherGame/:gameKey", handle_anotherGame);

		app.get("/config", (req, res) =>
				// To get here, had to know port and baseUrl
				// so no point in resending.
				res.send({
					edition: config.defaultEdition,
					editions: config.editions,
					dictionary: config.defaultDictionary,
					dictionaries: config.dictionaries
				}));

		// Handler for player joining a game
		app.get("/game/:gameKey/:playerKey", handle_enterGame);

		// Request handler for game interface / info
		app.get("/game/:gameKey", handle_gameGET);

		// Request handler for best play. Debug, allows us to pass in
		// any player key
		app.get("/bestPlay/:gameKey/:playerKey", handle_bestPlay);

		// Request handler for game command
		app.post("/game/:gameKey", handle_gamePOST);

		io.sockets.on('connection', socket => {
			// The server socket only listens to these messages.
			// However it emits a lot more, in 'Game.js'

			socket

			.on('monitor', () => {
				// Game monitor has joined
				console.log("Monitor joined");
				monitors.push(socket);
			})

			.on('disconnect', () => {
				const i = monitors.indexOf(socket);
				if (i >= 0) {
					// Game monitor has disconnected
					console.log("Monitor disconnected");
					monitors.slice(i, 1);
				}
			})

			.on('join', async params => {

				// Request to join a game.
				loadGame(params.gameKey)
				.then(game => {
					game.newConnection(socket, params.playerKey);
					socket.game = game;
					updateMonitors();
				});
			})

			.on('message', message => {
				console.log(message);
				if (message.text === '/cheat')
					socket.game.cheat(socket.player);
				else
					socket.game.notifyListeners('message', message);
			});
		});
	}

	function mainProgram() {

		// Command-line arguments
		let cliopt = Getopt.create([
			["h", "help", "Show this help"],
			["c", "config=ARG", "Path to config file (default config.json)"]
		])
			.bindHelp()
			.setHelp("Scrabble server\n[[OPTIONS]]")
			.parseSystem()
			.options;

		// Load config.json
		Fs.readFile(cliopt.config || 'config.json')
		.then(json => {
			config = JSON.parse(json);
			config.database = config.database || 'games.db';
		})

		// Index available editions
		.then(() => Fs.readdir(requirejs.toUrl('editions')))
		.then(editions => {
			// Edition names never start with _
			config.editions = editions.filter(e => /^[^_].*\.js$/.test(e)).map(e => e.replace(".js", ""));
		})

		// Index available dictionaries
		.then(() => Fs.readdir(requirejs.toUrl('dictionaries')))
		.then(dicts => {
			config.dictionaries = dicts.filter(e => /\.dict$/.test(e)).map(e => e.replace(".dict", ""));
		})

		// Configure email
		.then(() => {
			console.log('config', config);

			if (config.mailTransportConfig) {
				config.smtp = NodeMailer.createTransport(config.mailTransportConfig);
			} else if (process.env.MAILGUN_SMTP_SERVER) {
				config.mailSender = `wordgame@${process.env.MAILGUN_DOMAIN}`;
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

		// Configure database and run the server
		.then(config => connectDatabase(config.database))
		.then(() => runServer(config));
	}

	return mainProgram;
});
