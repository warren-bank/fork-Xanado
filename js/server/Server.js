/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node */

/**
 * Main program for Crossword Game server.
 */
define(
	'server/Server',
	[
		'fs-extra', 'node-getopt', 'events',
		'socket.io', 'http', 'nodemailer',
		'express', 'express-negotiate', 'cookie-parser', 'errorhandler', 'basic-auth-connect',   
		'platform/Platform',
		'game/Fridge', 'game/Game', 'game/Player', 'game/Edition',

		//'game/findBestPlay']; // when debugging, use this (unthreaded)
		'game/findBestPlayController'
	],
	(
		Fs, Getopt, Events,
		SocketIO, Http, NodeMailer,
		Express, negotiate, CookieParser, ErrorHandler, BasicAuth,
		Platform,
		Fridge, Game, Player, Edition, findBestPlay
	) => {

	class Server {
		
		constructor(config) {
			this.config = config;
			this.db = new Platform.Database('games', 'game');
			// Live games; map from game key to Game
			this.games = {};
			// Status-monitoring sockets (game pages)
			this.monitors = [];

			const server = new Express();
			
			// Parse incoming requests with url-encoded payloads
			server.use(Express.urlencoded({ extended: true }));

			// Parse incoming requests with a JSON body
			server.use(Express.json());

			// Grab unsigned cookies from the Cookie header
			server.use(CookieParser());

			// Grab all static files relative to the project root
			// html, images, css etc. The Content-type should be set
			// based on the file mime type (extension) but Express doesn't
			// always get it right.....
			console.log(`static files from ${requirejs.toUrl('')}`);
			server.use(Express.static(requirejs.toUrl('')));
			server.use(Express.static(requirejs.toUrl('js')));

			server.use((err, req, res, next) => {
				if (res.headersSent) {
					return next(err);
				}

				return res.status(err.status || 500).render('500');
			});

			server.use(ErrorHandler({
				dumpExceptions: true,
				showStack: true
			}));

			process.on('unhandledRejection', reason => {
				console.log('Command rejected', reason, reason.stack);
			});

			// TODO: use OAuth
			const gameListAuth = BasicAuth((username, password) => {
				if (config.gameListLogin) {
					return username == config.gameListLogin.username
					&& password == config.gameListLogin.password;
				} else {
					return true;
				}
			}, 'Enter game list access login');

			// HTML page for main interface (the "games" page)
			server.get('/', (req, res) =>
					res.sendFile(requirejs.toUrl('html/games.html')));

			// send email reminders about active games
			server.post('/send-game-reminders', () =>
						config.gameListLogin ? gameListAuth
						: (req, res, next) => next(),
						(req, res) => this.handle_sendGameReminders());

			// get a JSON list of available games (optionally including
			// completed games)
			server.get('/games',
					   (req, res) => this.handle_games(req, res));

			// get a JSON of the game history
			server.get('/history',
					 (req, res) => this.handle_history(req, res));

			// Get a list of available locales
			server.get('/locales',
					(req, res) => this.handle_locales(req, res));

			// Construct a new game
			server.post('/newGame',
						config.gameListLogin ? gameListAuth
						: (req, res, next) => next(),
						(req, res) => this.handle_newGame(req, res));

			// Delete an active or old game
			server.post('/deleteGame/:gameKey',
						config.gameListLogin ? gameListAuth
						: (req, res, next) => next(),
						(req, res) => this.handle_deleteGame(req, res));

			// Request another game in a series
			server.post('/anotherGame/:gameKey',
					  (req, res) => this.handle_anotherGame(req, res));

			// Get a JSON description of available editions
			server.get('/editions',
					 (req, res) => this.handle_editions(req, res));

			// Get a JSON description of available dictionaries
			server.get('/dictionaries',
					 (req, res) => this.handle_dictionaries(req, res));

			// Get a JSON description of defaults
			server.get('/defaults', (req, res) =>
					 res.send({
						 edition: config.defaultEdition,
						 dictionary: config.defaultDictionary
					 }));

			// Handler for player joining a game
			server.get('/game/:gameKey/:playerKey',
					 (req, res) => this.handle_enterGame(req, res));

			// Handler for game interface / info
			server.get('/game/:gameKey',
					 (req, res) => this.handle_gameGET(req, res));

			// Request handler for best play hint. Debug, allows us to pass in
			// any player key
			server.get('/bestPlay/:gameKey/:playerKey',
					 (req, res) => this.handle_bestPlay(req, res));

			// Request handler for a turn (or other game command)
			server.post('/game/:gameKey',
						config.gameListLogin ? gameListAuth
						: (req, res, next) => next(),
						(req, res) => this.handle_gamePOST(req, res));

			const http = Http.Server(server);
			http.listen(config.port);

			const io = new SocketIO.Server(http);

			io.sockets.on('connection', socket => {
				// The server socket only listens to these messages.
				// However it emits a lot more, in 'Game.js'

				socket

				.on('monitor', () => {
					// Games monitor has joined
					this.monitors.push(socket);
					console.log('Monitor joined');
				})

				.on('disconnect', () => {
					// Don't need to find the game using this socket, because
					// each game has a 'disconnect' listener on each of the
					// sockets being used.

					// Remove any monitor using this socket
					const i = this.monitors.indexOf(socket);
					if (i >= 0) {
						// Game monitor has disconnected
						console.log('Monitor disconnected');
						this.monitors.slice(i, 1);
					} else {
						console.log('Anonymous disconnect');
						this.updateMonitors();
					}
				})

				.on('join', async params => {
					// Player joining
					console.log(`Player ${params.playerKey} joining ${params.gameKey}`);
					this.loadGame(params.gameKey)
					.then(game => {
						game.connect(socket, params.playerKey);
						this.updateMonitors();
					});
				})

				.on('message', message => {

					// Chat message
					console.log(message);
					if (message.text === 'hint')
						socket.game.hint(socket.player);
					else if (message.text === 'advise') {
						socket.player.wantsAdvice = !socket.player.wantsAdvice;
						socket.game.notifyPlayer(
							socket.player, 'message',
							{
								sender: 'chat-advisor',
								text: 'chat-'
								+ (socket.player.wantsAdvice
								   ? 'enabled' : 'disabled')
							});
					} else
						socket.game.notifyPlayers('message', message);
				});
			});
		}

		/**
		 * Load the game from the DB, if not already in server memory
		 * @param key game key
		 * @return a Promise that resolves to a loaded Game
		 */
		async loadGame(key) {
			if (this.games[key])
				return Promise.resolve(this.games[key]);

			return this.db.get(key, Game.classes)
			.then(game => {

				game.setDB(this.db);

				Events.EventEmitter.call(game);

				Object.defineProperty(
					// makes connections non-persistent
					game, 'connections', { enumerable: false });
				this.games[key] = game;
				console.log(`Loaded game ${game}`);

				// May need to trigger several computer players until we
				// get to a human
				if (!game.ended) {
					const nextPlayer = game.players[game.whosTurn];
					console.log(`Next to play is ${nextPlayer}`);
					if (nextPlayer.isRobot) {
						return game.autoplay(nextPlayer)
						// May autoplay next robot recursively
						.then(turn => game.finishTurn(turn));
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
			console.log('Trapped', e);
			res.status(500).send(e.toString());
		}

		/**
		 * Handler for GET /games
		 * Sends a list of active games (optionally with completed games)
		 * pass ?active to get only active games
		 * @return a Promise
		 */
		handle_games(req, res) {
			const server = this;
			const all = (typeof req.query.active === "undefined");
			return this.db.keys()
			.then(keys => keys.map(
				key => server.games[key] || this.db.get(key, Game.classes)))
			.then(promises => Promise.all(promises))
			.then(games => games
				  .filter(game => (all || !game.ended))
				  .map(game => game.catalogue())
				  .sort((a, b) => a.timestamp > b.timestamp ? 1
						: a.timestamp < b.timestamp ? -1 : 0))
			.then(data => res.send(data))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for GET /history
		 * Sends a summary of cumulative player scores to date, for all
		 * unique players.
		 * @return a Promise
		 */
		handle_history(req, res) {
			const server = this;
			const players = {};

			return this.db.keys()
			.then(keys => keys.map(
				key => server.games[key] || this.db.get(key, Game.classes)))
			.then(promises => Promise.all(promises))
			.then(games => games
				  .filter(game => game.ended)
				  .map(game => game.players.map(
					  player => {
						  if (players[player.name])
							  players[player.name] += player.score;
						  else
							  players[player.name] = player.score;
					  })))
			.then(() => res.send(players))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for GET /locales; sends a list of available locales.
		 * Used when selecting a presentation language for the UI.
		 * @return a Promise
		 */
		handle_locales(req, res) {
			const db = new Platform.Database('i18n', 'json');
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
			const db = new Platform.Database('editions', 'js');
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
			this.db.all((key, game) => game.emailTurnReminder(this.config));
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
				let dictionary = null;
				if (req.body.dictionary
					&& req.body.dictionary != 'none') {
					console.log(`\twith dictionary ${req.body.dictionary}`);
					dictionary = req.body.dictionary;
				} else
					console.log('\twith no dictionary');

				return new Game(edition.name, dictionary)
				.create();
			})
			.then(game => {

				game.setDB(this.db);

				let haveHuman = false;
				for (let p of req.body.players) {
					const player = new Player(p.name, p.isRobot == 'true');
					if (!player.isRobot) {
						haveHuman = true;
						if (p.email)
							// optional, may be empty
							player.email = p.email;
					}

					game.addPlayer(player);
					console.log(player.toString());
				}

				if (!haveHuman)
					throw Error('error-need-human');

				game.time_limit = req.body.time_limit || 0;
				if (game.time_limit > 0)
					console.log(`\t${game.time_limit} minute time limit`);
				else
					console.log('\twith no time limit');

				console.log(game.toString());

				// Save the game when everything has been initialised
				// (asynchronous)
				game.save();

				game.emailInvitations(this.config);

				// Redirect back to control panel
				res.redirect('/html/games.html');
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
					return Promise.resolve();

				// Who the request is coming from
				const player = info.player;
				const command = req.body.command;
				const args = req.body.args ? JSON.parse(req.body.args) : null;
				
				console.log(`COMMAND ${command} player ${player.name} game ${game.key}`, args);

				let promise;
				switch (command) {

				case 'makeMove':
					promise = game.checkTurn(player)
					.then(game => game.makeMove(args));
					break;

				case 'pass':
					promise = game.checkTurn(player)
					.then(game => game.pass('pass'));
					break;

				case 'swap':
					promise = game.checkTurn(player)
					.then(game => game.swap(args));
					break;

				case 'challenge':
					// Check the last move in the dictionary
					promise = game.challenge();
					break;

				case 'takeBack':
					promise = game.takeBack('took-back');
					break;

				default:
					// Terminal, no point in translating
					throw Error(`unrecognized command: ${command}`);
				}

				return promise.then(turn => {
					game.finishTurn(turn)
					.then(() => {
						// Notify non-game monitors (games pages)
						this.updateMonitors();
						// Respond with the new tile list for the
						// human player. This is only used for swap
						// and makeMove, and other info (such as robot
						// tile states) is sent using messaging.
						// TODO: this is messy; mixed messaging.
						console.log("Sending new tiles", turn.newTiles);
						res.send(Fridge.freeze(turn.newTiles || []));
					});
				});
			})
			.catch(e => this.trap(e, res));
		}
	}

	function mainProgram() {

		// Command-line arguments
		const cliopt = Getopt.create([
			['h', 'help', 'Show this help'],
			['c', 'config=ARG', 'Path to config file (default config.json)']
		])
			.bindHelp()
			.setHelp('Crossword game server\n[[OPTIONS]]')
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
