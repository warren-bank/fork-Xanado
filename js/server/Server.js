/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node */

define('server/Server', [
	'fs', 'node-getopt', 'events',
	'socket.io', 'http', 'https', 'nodemailer', "cors",
	'express', 'express-negotiate', 'errorhandler','express-session', 
	'platform', 'server/UserManager',
	'game/Fridge', 'game/Game', 'game/Player', 'game/Edition'
], (
	fs, Getopt, Events,
	SocketIO, Http, Https, NodeMailer, cors,
	Express, ExpressNegotiate, ErrorHandler, ExpressSession, 
	Platform, UserManager,
	Fridge, Game, Player, Edition
) => {

	const Fs = fs.promises;

	/**
	 * Web server for crossword game.
	 */
	class Server {

		/**
		 * @param {Object} config See example-config.json for content
		 */
		constructor(config) {
			this.config = config;
			this.db = new Platform.Database('games', 'game');
			// Live games; map from game key to Game
			this.games = {};
			// Status-monitoring sockets (game pages)
			this.monitors = [];

			process.on('unhandledRejection', reason => {
				console.log('Command rejected', reason, reason.stack);
			});

			const express = new Express();

			// Headers not added by passport?
			express.use(cors());

			// Parse incoming requests with url-encoded payloads
			express.use(Express.urlencoded({ extended: true }));

			// UserManager requires ExpressSession to be configured
			express.use(ExpressSession({
				secret: this.config.auth.sessionSecret,
				resave: false,
				saveUninitialized: false
			}));


			// Parse incoming requests with a JSON body
			express.use(Express.json());

			// Grab all static files relative to the project root
			// html, images, css etc. The Content-type should be set
			// based on the file mime type (extension) but Express doesn't
			// always get it right.....
			console.log(`static files from ${requirejs.toUrl('')}`);
			express.use(Express.static(
				requirejs.toUrl(''),
				{
					setHeaders: (res, path, stat) => {
						console.log(`Sending ${path}`);
					}
				}));

			express.use((req, res, next) => {
				console.log(req.method, req.url);
				next();
			});

			this.userManager = new UserManager(config, express);
			
			const cmdRouter = Express.Router();
			// get the HTML page for main interface (the "games" page)
			cmdRouter.get('/',
					   (req, res) => res.sendFile(
						   requirejs.toUrl('html/games.html')));

			// completed games)
			cmdRouter.get('/games',
					   (req, res) => this.handle_games(req, res));

			// get a JSON of the game history
			cmdRouter.get('/history',
					   (req, res) => this.handle_history(req, res));

			// Get a JSON list of available locales
			cmdRouter.get('/locales',
					(req, res) => this.handle_locales(req, res));

			// Get a JSON description of available editions
			cmdRouter.get('/editions',
					 (req, res) => this.handle_editions(req, res));

			// Get a JSON description of available dictionaries
			cmdRouter.get('/dictionaries',
					 (req, res) => this.handle_dictionaries(req, res));

			// Get a JSON description of defaults
			cmdRouter.get('/defaults', (req, res) =>
					 res.send({
						 edition: config.defaultEdition,
						 dictionary: config.defaultDictionary
					 }));

			// Get the JSON game summary
			cmdRouter.get('/game/:gameKey',
					 (req, res) => this.handle_game(req, res));

			// Request handler for best play hint. Allows us to pass in
			// any player key, which is useful for debug (though could
			// be used to cheat)
			cmdRouter.get('/bestPlay/:gameKey/:playerKey',
						(req, res, next) =>
						this.userManager.checkLoggedIn(req, res, next),
					   (req, res) => this.handle_bestPlay(req, res));

			// Construct a new game
			cmdRouter.post('/createGame',
						(req, res, next) =>
						this.userManager.checkLoggedIn(req, res, next),
						(req, res) => this.handle_createGame(req, res));

			// Start a new game
			cmdRouter.post('/startGame/:gameKey',
						(req, res, next) =>
						this.userManager.checkLoggedIn(req, res, next),
						(req, res) => this.handle_startGame(req, res));

			// Delete an active or old game. Invoked from games.js
			cmdRouter.post('/deleteGame/:gameKey',
						(req, res, next) =>
						this.userManager.checkLoggedIn(req, res, next),
						(req, res) => this.handle_deleteGame(req, res));

			// Request another game in a series
			// Note this is NOT auth-protected, it is invoked
			// from the game interface to create a follow-on game
			cmdRouter.post('/anotherGame/:gameKey',
						(req, res, next) =>
						this.userManager.checkLoggedIn(req, res, next),
						(req, res) => this.handle_anotherGame(req, res));

			// send email reminders about active games
			cmdRouter.post('/sendReminder/:gameKey',
						(req, res, next) =>
						this.userManager.checkLoggedIn(req, res, next),
						(req, res) => this.handle_sendReminder(req, res));

			// Handler for player joining a game
			cmdRouter.post('/join/:gameKey/:playerKey',
					   (req, res, next) =>
					   this.userManager.checkLoggedIn(req, res, next),
					   (req, res) => this.handle_join(req, res));

			// Handler for player leaving a game
			cmdRouter.post('/leave/:gameKey/:playerKey',
					   (req, res, next) =>
					   this.userManager.checkLoggedIn(req, res, next),
					   (req, res) => this.handle_leave(req, res));

			// Handler for adding a robot to a game
			cmdRouter.post('/addRobot/:gameKey',
					   (req, res, next) =>
					   this.userManager.checkLoggedIn(req, res, next),
					   (req, res) => this.handle_addRobot(req, res));

			// Request handler for a turn (or other game command)
			cmdRouter.post('/command/:command/:gameKey/:playerKey',
						(req, res, next) =>
						this.userManager.checkLoggedIn(req, res, next),
						(req, res) => this.handle_command(req, res));

			express.use(cmdRouter);

			express.use((err, req, res, next) => {
				if (res.headersSent) {
					return next(err);
				}
				console.log("<-- 500", err);
				res.status(500).send(err);
				return res.status(err.status || 500);
			});

			express.use(ErrorHandler({
				dumpExceptions: true,
				showStack: true
			}));

			const http = config.https
				  ? Https.Server(config.https, express)
				  : Http.Server(express);

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
					else if (message.text === 'advise')
						socket.game.toggleAdvice(socket.player);
					else
						socket.game.notifyPlayers('message', message);
				});
			});
		}

		/**
		 * Load the game from the DB, if not already in server memory
		 * @param {string} key game key
		 * @return {Promise} Promise that resolves to a {@link Game}
		 */
		loadGame(key) {
			if (this.games[key])
				return Promise.resolve(this.games[key]);

			return this.db.get(key, Game.classes)
			.then(game => game.onLoad(this.db))
			.then(game => game.checkTimeout())
			.then(game => {
				Events.EventEmitter.call(game);

				Object.defineProperty(
					// makes connections non-persistent
					game, 'connections', { enumerable: false });
				this.games[key] = game;
				//console.log(`Loaded game ${game}`);

				if (game.hasEnded())
					return game;

				const player = game.getPlayer();
				if (player)
					game.playIfReady();
				return game;
			})
			.catch(e => {
				console.log(`Failed to load game ${key}`, e);
				return Promise.reject([
					/*i18n*/'Cannot load $1',
					key, e
				]);
			});
		}

		/**
		 * Notify monitors (/games pages) that something has changed
		 */
		updateMonitors() {
			this.monitors.forEach(socket => socket.emit('update'));
		}

		/**
		 * Before processing a Move instruction (pass or play) check that
		 * the game is ready to accept a Turn from the given player.
		 * @param {Player} player - Player to check
		 * @param {Game} game - Game to check
		 */
		checkTurn(player, game) {
			if (game.hasEnded()) {
				console.log(`Game ${game.key} has ended ${game.state}`);
				throw new Error(/*i18n*/'Game has ended');
			}

			// determine if it is this player's turn
			if (player.index !== game.whosTurn) {
				console.log(`not ${player.name}'s turn`);
				throw new Error(/*i18n*/'Not your turn');
			}
		}

		/**
		 * Generic catch for response handlers
		 */
		trap(e, res) {
			console.log('<-- 500', e);
			res.status(500).send(e);
		}

		/**
		 * Sends a catalogue of active games (optionally with completed games)
		 * pass ?active to get only active games. Note: does NOT send game
		 * onjects, rather a simple catalogue of Objects.
		 * @return {Promise} Promise to send a catalogue of games
		 */
		handle_games(req, res) {
			const server = this;
			const all = (req.query.all === "true");
			return this.db.keys()
			.then(keys => keys.map(key => this.loadGame(key)))
			.then(promises => Promise.all(promises))
			.then(games => Promise.all(
				games
				.filter(game => (all || !game.hasEnded()))
				.map(game => game.catalogue(this.userManager))))
			.then(gs => gs.sort((a, b) => a.timestamp > b.timestamp ? 1
								: a.timestamp < b.timestamp ? -1 : 0))
			.then(data => res.status(200).send(data))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for GET /history
		 * Sends a summary of cumulative player scores to date, for all
		 * unique players.
		 * @return {Promise}
		 */
		handle_history(req, res) {
			const server = this;
			const scores = {};
			const wins = {};
			const names = {};

			return this.db.keys()
			.then(keys => keys.map(key => this.loadGame(key)))
			.then(promises => Promise.all(promises))
			.then(games => games
				  .filter(game => game.hasEnded())
				  .map(game => {
					  const winScore = game.winningScore();
					  game.players.map(
						  player => {
							  names[player.key] = player.name;
							  if (player.score === winScore) {
								  if (typeof wins[player.key] === 'undefined')
									  wins[player.key] = 1;
								  else
									  wins[player.key]++;
							  }
							  const s = scores[player.key] || 0;
							  scores[player.key] = s + player.score;
						  });
				  }))
			.then(() => res.status(200).send({
				names: names,
				scores: scores,
				wins: wins
			}))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for GET /locales
		 * Sends a list of available locales.  Used when selecting a
		 * presentation language for the UI.
		 * @return {Promise} Promise to list locales
		 */
		handle_locales(req, res) {
			const db = new Platform.Database('i18n', 'json');
			return db.keys()
			.then(keys => {
				res.status(200).send(keys);
			})
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for GET /editions
		 * Promise to get an index of available editions.
		 * return {Promise} Promise to index available editions
		 */
		handle_editions(req, res) {
			const db = new Platform.Database('editions', 'js');
			return db.keys()
			.then(editions => res.status(200).send(
				editions
				.filter(e => !/^_/.test(e))))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for GET /dictionaries
		 * return {Promise} Promise to index available dictionaries
		 */
		handle_dictionaries(req, res) {
			const db = new Platform.Database('dictionaries', 'dict');
			return db.keys()
			.then(keys => res.status(200).send(keys))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for POST /sendReminder
		 * Email reminders to next human player in (each) game
		 */
		handle_sendReminder(req, res) {
			const gameKey = req.params.gameKey;
			console.log('Sending turn reminders');
			const surly = `${req.protocol}://${req.get('Host')}`;
			const prom = (gameKey === '*')
				  ? this.db.keys() : Promise.resolve([gameKey]);
			return prom.then(keys => Promise.all(keys.map(
				key => (Promise.resolve(this.games[key])
						|| this.db.get(key, Game.classes))
				.then(game => game.emailReminder(
					surly, this.config, this.userManager,
					req.session.passport.user.key)))))
			.then(data => res.status(200).send([/*i18n*/'Reminded $1', data.join(', ')]))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for POST /createGame
		 * @return {Promise}
		 */
		handle_createGame(req, res) {
			console.log(`Constructing new game ${req.body.edition}`);
			let maxPlayers = req.body.maxPlayers;

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
			.then(game => game.onLoad(this.db))
			.then(game => {
				game.time_limit = req.body.time_limit || 0;
				if (game.time_limit > 0)
					console.log(`\t${game.time_limit} minute time limit`);

				if (req.body.max_players > 1) {
					game.maxPlayers = req.body.max_players;
					console.log(`\tat most ${game.maxPlayers} players`);
				} else
					game.maxPlayers = 0;

				console.log(game.toString());

				// Save the game when everything has been initialised
				return game.save();
			})
			.then(game => res.status(200).send(game.key));
		}

		/**
		 * Handle /startGame/:gameKey
		 * @return {Promise}
		 */
		handle_startGame(req, res) {
			const gameKey = req.params.gameKey;
			return this.loadGame(gameKey)
			.then(game => {
				// Check the game can be started
				const err = game.blocked();
				if (err)
					return res.status(500).send(err);
				
				// Pick a random tile from the bag
				game.whosTurn = Math.floor(Math.random() * game.players.length);
			
				game.emailInvitations(
					`${req.protocol}://${req.get('Host')}`,
					this.config, req.session.passport.user.key);

				game.start();

				// Redirect back to control panel
				return res.redirect('/html/games.html');
			})
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handle /join/:gameKey player joining a game.
		 * @return {Promise}
		 */
		handle_join(req, res) {
			const gameKey = req.params.gameKey;
			return this.loadGame(gameKey)
			.then(game => {
				// Player is either joining or connecting
				const playerKey = req.user.key;
				let player = game.getPlayerWithKey(playerKey), prom;
				if (player) {
					console.log(`Player ${playerKey} opening ${gameKey}`);
					prom = Promise.resolve(game);
				} else {
					console.log(`Player ${playerKey} joining ${gameKey}`);
					player = new Player(
						req.user.name, playerKey, false,
						() => req.user.email
					);
					game.addPlayer(player);
					prom = game.save();
				}
				// The game may now be ready to start
				return prom.then(game => game.playIfReady());
			})
			.then(() => res.status(200).send({
				gameKey: gameKey,
				playerKey: req.user.key
			}))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handle /addRobot/:gameKey to add a robot to the game
		 * It's an error to add a robot to a game that already has a robot.
		 * @return {Promise}
		 */
		handle_addRobot(req, res) {
			const gameKey = req.params.gameKey;
			return this.loadGame(gameKey)
			.then(game => {
				if (game.hasRobot())
					return res.status(500).send("Game already has a robot");
				console.log(`Robot joining ${gameKey}`);
				// Robot always has the same player key
				const robot = new Player(
					'Robot', UserManager.ROBOT_KEY, true);
				game.addPlayer(robot);
				return game.save()
				// Game may now be ready to start
				.then(game => game.playIfReady())
				.then(mess => res.status(200)
					  .send(mess || 'Robot'));
			})
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handle /leave/:gameKey player leaving a game.
		 * @return {Promise}
		 */
		handle_leave(req, res) {
			const gameKey = req.params.gameKey;
			const playerKey = req.params.playerKey;
			return this.loadGame(gameKey)
			.then(game => {
				console.log(`Player ${playerKey} leaving ${gameKey}`);
				const player = game.getPlayerWithKey(playerKey);
				if (player) {
					game.removePlayer(player);
					return game.save()
					.then(() => res.status(200).send(
						{ gameKey: gameKey, playerKey: playerKey }));
				}
				return res.status(500).send("Player is not in game");
			})
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handle /game/:gameKey request for a dump of the game information.
		 * @return {Promise}
		 */
		handle_game(req, res) {
			const gameKey = req.params.gameKey;
			return this.db.get(gameKey, Game.classes)
			.then(game => res.status(200).send(Fridge.freeze(game)))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handle /bestPlay/:gameKey/:playerKey
		 * Find the best play for the player, given the current board
		 * state. Note that it may not be their turn, that's OK, this is debug
		 * @return {Promise}
		 */
		handle_bestPlay(req, res) {
			const gameKey = req.params.gameKey;
			const playerKey = req.params.playerKey;
			return this.loadGame(gameKey)
			.then(game => {
				const player = game.getPlayerWithKey(playerKey);
				return Platform.findBestPlay(game, player.rack.tiles());
			})
			.then(play => res.status(200).send(Fridge.freeze(play)))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handle /deleteGame/:gameKey
		 * Delete a game.
		 * @return {Promise}
		 */
		handle_deleteGame(req, res) {
			const gameKey = req.params.gameKey;
			console.log("Delete game",gameKey);
			return this.loadGame(gameKey)
			.then(() => this.db.rm(gameKey))
			.then(() => res.status(200).send(`${gameKey} deleted`))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Create another game with the same players.
		 * @return {Promise}
		 */
		handle_anotherGame(req, res) {
			return this.loadGame(req.params.gameKey)
			.then(game => game.anotherGame())
			.catch(e => this.trap(e, res));
		}

		/**
		 * Result is always a Turn object, though the actual content
		 * varies according to the command sent.
		 * @return {Promise}
		 */
		handle_command(req, res) {
			const command = req.params.command;
			const gameKey = req.params.gameKey;
			const playerKey = req.params.playerKey;
			console.log(`Handling ${command} ${gameKey} ${playerKey}`);
			return this.loadGame(gameKey)
			.then(game => {
				const player = game.getPlayerWithKey(playerKey);

				if (game.hasEnded())
					return Promise.resolve();

				// The command name and arguments
				const args = req.body.args ? JSON.parse(req.body.args) : null;
				
				console.log(`COMMAND ${command} player ${player.name} game ${game.key}`);

				let promise;
				switch (command) {

				case 'makeMove':
					this.checkTurn(player, game);
					promise = game.makeMove(args);
					break;

				case 'pass':
					this.checkTurn(player, game);
					promise = game.pass('pass');
					break;

				case 'swap':
					this.checkTurn(player, game);
					promise = game.swap(args);
					break;

				case 'challenge':
					this.checkTurn(player, game);
					promise = game.challenge();
					break;

				case 'takeBack':
					promise = game.takeBack('took-back');
					break;

				case 'confirmGameOver':
					promise = game.confirmGameOver(/*i18n*/'Game over');
					break;

				case 'pause':
					promise = game.togglePause(player);
					break;

				case 'unpause':
					promise = game.togglePause(player);
					break;

				default:
					throw Error(`unrecognized command: ${command}`);
				}

				return promise.then(
					turn =>	{
						if (turn)
							return game.finishTurn(turn); // turn taken
						return game.save(); // simple state change
					})
				.then(() => {
					console.log(`${command} command handled`);
					// Notify non-game monitors (games pages)
					this.updateMonitors();
					res.status(200).send("OK");
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
			.setHelp('Xanado server\n[[OPTIONS]]')
			.parseSystem()
			.options;

		// Load config.json
		Fs.readFile(cliopt.config || 'config.json')
		.then(json => JSON.parse(json))

		// Configure email
		.then(config => {

			if (config.mail) {
				let transport;
				if (config.mail.transport === "mailgun") {
					if (!process.env.MAILGUN_SMTP_SERVER)
						console.error('mailgun configuration requested, but MAILGUN_SMTP_SERVER not defined');
					else {
						if (!config.mail.sender)
							config.mail.sender = `wordgame@${process.env.MAILGUN_DOMAIN}`;
						transport = {
							host: process.env.MAILGUN_SMTP_SERVER,
							port: process.env.MAILGUN_SMTP_PORT,
							secure: false,
							auth: {
								user: process.env.MAILGUN_SMTP_LOGIN,
								pass: process.env.MAILGUN_SMTP_PASSWORD
							}
						};
					}
				} else
					// Might be SMTP, might be something else
					transport = config.mail.transport;
				
				if (transport)
					config.mail.transport = NodeMailer.createTransport(
						transport);
			}

			const promises = [];
			if (config.https) {
				promises.push(
					Fs.readFile(config.https.key)
					.then(k => { config.https.key = k; }));
				promises.push(
					Fs.readFile(config.https.cert)
					.then(c => { config.https.cert = c; }));
			}
			return Promise.all(promises)
			.then(() => new Server(config));
		});
	}

	return mainProgram;
});
