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

	'platform/Platform',
	'game/Fridge',
	'game/Game',
	'game/Player',
	'game/Edition',

	"game/findBestPlay"];
//	"game/findBestPlayController"];

define("server/Server", main_deps, (Fs, Getopt, Events, SocketIO, Http, NodeMailer, Express, negotiate, MethodOverride, CookieParser, ErrorHandler, BasicAuth, Platform, Fridge, Game, Player, Edition, findBestPlay) => {

	class Server {
		
		constructor(config) {
			this.config = config;

			const app = new Express();

			this.db = new Platform.Database('games', 'game');

			// Live games; map from game key to Game
			this.games = {};

			// Status-monitoring sockets (game pages)
			this.monitors = [];

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

			process.on('unhandledRejection', reason => {
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
			app.post("/send-game-reminders", () => this.handle_sendGameReminders());

			// AJAX request for available games
			app.get("/games",
					 config.gameListLogin ? gameListAuth
					 : (req, res, next) => next(),
					 (req, res) => this.handle_games(req, res)
					);

			app.get("/locales",
					(req, res) => this.handle_locales(req, res));

			// Construct a new game
			app.post("/newGame",
					  (req, res) => this.handle_newGame(req, res));

			app.post("/deleteGame/:gameKey",
					  (req, res) => this.handle_deleteGame(req, res));

			app.post("/anotherGame/:gameKey",
					  (req, res) => this.handle_anotherGame(req, res));

			app.get('/editions',
					 (req, res) => this.handle_editions(req, res));

			app.get('/dictionaries',
					 (req, res) => this.handle_dictionaries(req, res));
			
			app.get("/defaults", (req, res) =>
					 res.send({
						 edition: config.defaultEdition,
						 dictionary: config.defaultDictionary
					 }));

			// Handler for player joining a game
			app.get("/game/:gameKey/:playerKey",
					 (req, res) => this.handle_enterGame(req, res));

			// Request handler for game interface / info
			app.get("/game/:gameKey",
					 (req, res) => this.handle_gameGET(req, res));

			// Request handler for best play. Debug, allows us to pass in
			// any player key
			app.get("/bestPlay/:gameKey/:playerKey",
					 (req, res) => this.handle_bestPlay(req, res));

			// Request handler for game command
			app.post("/game/:gameKey",
					  (req, res) => this.handle_gamePOST(req, res));

			io.sockets.on('connection', socket => {
				// The server socket only listens to these messages.
				// However it emits a lot more, in 'Game.js'

				socket

				.on('monitor', () => {
					// Game monitor has joined
					console.log("Monitor joined");
					this.monitors.push(socket);
				})

				.on('disconnect', () => {
					const i = this.monitors.indexOf(socket);
					if (i >= 0) {
						// Game monitor has disconnected
						console.log("Monitor disconnected");
						this.monitors.slice(i, 1);
					}
				})

				.on('join', async params => {

					// Request to join a game.
					this.loadGame(params.gameKey)
					.then(game => {
						game.newConnection(socket, params.playerKey);
						socket.game = game;
						this.updateMonitors();
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

		/**
		 * Load the game from the DB, if not already in server memory
		 * @param key game key
		 * @return a Promise to load the Game
		 */
		loadGame(key) {
			if (this.games[key])
				return Promise.resolve(this.games[key]);

			return this.db.get(key, Game.classes)
			.then(game => {

				game.saver = saveGame => {
					console.log(`Saving game ${saveGame.key}`);
					return this.db.set(saveGame.key, saveGame);
				};

				game.connections = [];

				Events.EventEmitter.call(game);

				Object.defineProperty(
					// makes connections non-persistent
					game, 'connections', { enumerable: false });
				this.games[key] = game;
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

				return game;
			})
			.catch(e => {
				console.log(`Failed to load game ${key}`, e);
				return Promise.reject('error-game-does-not-exist');
			});
		}

		/**
		 * Notify monitors (/games pages) that something has changed
		 */
		updateMonitors() {
			this.monitors.forEach(socket => {
				socket.emit('update');
			});
		}

		/**
		 * Generic catch for response handlers
		 */
		trap(e, res) {
			console.log("Trapped", e);
			res.status(500).send(e.toString());
		}

		/**
		 * Handler for GET /games
		 * Sends a list of active games
		 * @return a Promise
		 */
		handle_games(req, res) {
			this.db.keys()
			.then(keys => keys.map(
				key => this.db.get(key, Game.classes)))
			.then(
				promises =>	Promise.all(promises)
				.then(games =>
					  games.filter(game => !game.ended)
					  .map(game => { return {
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
					  }}))
				.then(data => res.send(data)))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for GET /locales; sends a list of available locales.
		 * Used when selecting a presentation language for the UI.
		 * @return a Promise
		 */
		handle_locales(req, res) {
			let db = new Platform.Database('i18n', 'json');
			return db.keys()
			.then(keys => {
				res.send(keys);
			})
			.catch(e => this.trap(e, res));
		}

		/**
		 * Promise to get an index of available editions. Note that
		 * editions are loaded using requirejs, so there's an implicit
		 * assumption about Platform.Database here
		 */
		handle_editions(req, res) {
			const db = new Platform.Database('editions', "js");
			db.keys()
			.then(editions => res.send(
				editions
				.filter(e => !/^_/.test(e))))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Promise to Index available dictionaries
		 */
		handle_dictionaries(req, res) {
			const db = new Platform.Database('dictionaries', 'dict');
			db.keys()
			.then(keys => res.send(keys))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for /send-game-reminders
		 * Email reminders to next human player in each game
		 */
		handle_sendGameReminders() {
			this.db.all((key, game) => game.emailTurnReminder(config));
		}

		/**
		 * Handler for POST /newGame. 
		 * @return a Promise
		 */
		handle_newGame(req, res) {
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
					return this.db.set(game.key, game);
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

					game.emailInvitations(this.config);

					// Redirect back to control panel
					res.redirect("/html/games.html");
				});
			})
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for /game/:gameKey/:playerKey, player joining a game.
		 * Sets a cookie in the response with the player key so future
		 * requests can be handled correctly.
		 * @return Promise
		 */
		handle_enterGame(req, res) {
			const gameKey = req.params.gameKey;
			const playerKey = req.params.playerKey;
			return this.loadGame(gameKey)
			.then(() => {
				console.log(`Player ${playerKey} Entering ${gameKey}`); 
				res.cookie(gameKey, playerKey, {
					path: '/',
					maxAge: (30 * 24 * 60 * 60 * 1000) // 30 days
				});
				// Redirect to handle_gameGET() for the HTML
				res.redirect(`/game/${gameKey}`);
			})
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for GET /game/:gameKey
		 * If the accept: in the request is asking for 'application/json'
		 * then respond with JSON with the current game state, if it's
		 * asking for HTML with the HTML page for the game.
		 */
		handle_gameGET(req, res) {
			const gameKey = req.params.gameKey;
			// Use express-negotiate to negotiate the response type
			req.negotiate({
				'application/json': () => this.db.get(gameKey, Game.classes)
				.then(game => res.send(Fridge.freeze(game)))
				.catch(e => this.trap(e, res)),
				'html': () => res.sendFile(requirejs.toUrl('html/game.html'))
			});
		}

		/**
		 * Handler for GET /bestPlay
		 * @return Promise
		 */
		handle_bestPlay(req, res) {
			const gameKey = req.params.gameKey;
			const playerKey = req.params.playerKey;
			return this.loadGame(gameKey)
			.then(game => game.lookupPlayer(playerKey))
			// Find the best play for the player, given the current board
			// state. Note that it may not be their turn, that's OK, this is debug
			.then(info => findBestPlay(info.game, info.player.rack.tiles()))
			.then(play => res.send(Fridge.freeze(play)))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for POST /deleteGame
		 */
		handle_deleteGame(req, res) {
			const gameKey = req.params.gameKey;
			return this.loadGame(gameKey)
			.then(() => this.db.rm(gameKey))
			.then(() => res.send(`OK ${gameKey} deleted`))
			.catch(e => this.trap(e, res));
		}

		handle_anotherGame(req, res) {
			return this.loadGame(req.params.gameKey)
			.then(game => game.anotherGame())
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for POST /game
		 * Result is always a Turn object, though the actual content
		 * varies according to the command sent.
		 * @return Promise
		 */
		handle_gamePOST(req, res) {
			const gameKey = req.params.gameKey;
			// Get cookie set by handle_enterGame that identifies the player
			const playerKey = req.cookies[gameKey];
			return this.loadGame(gameKey)
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
					this.updateMonitors();
					// Send something for Ui.handleMoveResponse
					// This really only applies to swap and makeMove,
					// as updateGameState sends info for other commands
					res.send(Fridge.freeze(result.newTiles || []));
				});
			})
			.catch(e => this.trap(e, res));
		}
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
		.then(json => JSON.parse(json))

		// Configure email
		.then(config => {
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
			return new Server(config);
		});
	}

	return mainProgram;
});
