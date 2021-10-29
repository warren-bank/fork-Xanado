/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node */

define('server/Server', [
	'fs-extra', 'node-getopt', 'events',
	'socket.io', 'http', 'https', 'nodemailer',
	'express', 'express-negotiate', 'cookie-parser', 'errorhandler',
	'express-basic-auth',   
	'platform',
	'game/Fridge', 'game/Game', 'game/Player', 'game/Edition'
], (
	Fs, Getopt, Events,
	SocketIO, Http, Https, NodeMailer,
	Express, negotiate, CookieParser, ErrorHandler,
	BasicAuth,
	Platform,
	Fridge, Game, Player, Edition
) => {

	/**
	 * Main program for Crossword Game server.
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

			const express = new Express();

			// Use a Router for clear separation of concerns
			const router = Express.Router();

			// Create a router that supports basic authentication
			// if the route requires it.
			const auth_router = Express.Router();
			if (config.auth) {
				auth_router.use(BasicAuth({
					// Map from username to password
					users: config.auth,
					// Required to prompt
					challenge: true,
					// Realm for 401 response
					realm: Platform.i18n('games-login')
				}));
			}

			// Parse incoming requests with url-encoded payloads
			express.use(Express.urlencoded({ extended: true }));

			// Parse incoming requests with a JSON body
			express.use(Express.json());

			// Grab unsigned cookies from the Cookie header
			express.use(CookieParser());

			// Grab all static files relative to the project root
			// html, images, css etc. The Content-type should be set
			// based on the file mime type (extension) but Express doesn't
			// always get it right.....
			console.log(`static files from ${requirejs.toUrl('')}`);
			express.use(Express.static(requirejs.toUrl('')));
			express.use(Express.static(requirejs.toUrl('js')));

			express.use(router);

			express.use((err, req, res, next) => {
				if (res.headersSent) {
					return next(err);
				}

				res.send(`500 ${err}`);
				return res.status(err.status || 500);
			});

			express.use(ErrorHandler({
				dumpExceptions: true,
				showStack: true
			}));

			process.on('unhandledRejection', reason => {
				console.log('Command rejected', reason, reason.stack);
			});

			// get the HTML page for main interface (the "games" page)
			router.get('/',
					   (req, res) => res.sendFile(
						   requirejs.toUrl('html/games.html')));

			// get a JSON list of available games (optionally including
			// completed games)
			router.get('/games',
					   (req, res) => this.handle_games(req, res));

			// get a JSON of the game history
			router.get('/history',
					   (req, res) => this.handle_history(req, res));

			// Get a JSON list of available locales
			router.get('/locales',
					(req, res) => this.handle_locales(req, res));

			// Get a JSON description of available editions
			router.get('/editions',
					 (req, res) => this.handle_editions(req, res));

			// Get a JSON description of available dictionaries
			router.get('/dictionaries',
					 (req, res) => this.handle_dictionaries(req, res));

			// Get a JSON description of defaults
			router.get('/defaults', (req, res) =>
					 res.send({
						 edition: config.defaultEdition,
						 dictionary: config.defaultDictionary
					 }));

			// Construct a new game. Invoked from createGame.js
			router.post('/newGame',
						auth_router,
						(req, res) => this.handle_newGame(req, res));

			// Delete an active or old game. Invoked from games.js
			router.post('/deleteGame/:gameKey',
						auth_router,
						(req, res) => this.handle_deleteGame(req, res));

			// Request another game in a series
			// Note this is NOT auth-protected, it is invoked
			// from the game interface to create a follow-on game
			router.post('/anotherGame/:gameKey',
					  (req, res) => this.handle_anotherGame(req, res));

			// send email reminders about active games
			router.post('/sendReminders',
						auth_router,
						(req, res) => this.handle_sendTurnReminders(req, res));

			// Handler for player joining a game
			router.get('/game/:gameKey/:playerKey',
					 (req, res) => this.handle_enterGame(req, res));

			// Get the game interface or JSON game summary
			router.get('/game/:gameKey',
					 (req, res) => this.handle_gameGET(req, res));

			// Request handler for best play hint. Allows us to pass in
			// any player key, which is useful for debug (though could
			// be used to cheat)
			router.get('/bestPlay/:gameKey/:playerKey',
					 (req, res) => this.handle_bestPlay(req, res));

			// Request handler for a turn (or other game command)
			// NOT auth protected, security hole that could allow
			// someone to screw up games
			router.post('/command/:gameKey',
						(req, res) => this.handle_command(req, res));

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
		async loadGame(key) {
			if (this.games[key])
				return Promise.resolve(this.games[key]);

			return this.db.get(key, Game.classes)
			.then(game => game.onLoad(this.db))
			.then(game => {
				Events.EventEmitter.call(game);

				Object.defineProperty(
					// makes connections non-persistent
					game, 'connections', { enumerable: false });
				this.games[key] = game;
				console.log(`Loaded game ${game}`);

				if (game.ended)
					return game;

				const nextPlayer = game.getActivePlayer();
				console.log(`Next to play is ${nextPlayer}`);
				if (nextPlayer.isRobot) {
					return game.autoplay(nextPlayer)
					// May autoplay next robot recursively
					.then(turn => game.finishTurn(turn))
					.then(() => game);
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
			this.monitors.forEach(socket => socket.emit('update'));
		}

		/**
		 * Before processing a Move instruction (pass or play) check that
		 * the game is ready to accept a Turn from the given player.
		 * @param {Player} player - Player to check
		 * @param {Game} game - Game to check
		 */
		checkTurn(player, game) {
			if (game.ended) {
				console.log(`Game ${game.key} has ended`);
				throw new Error('error-game-has-ended');
			}

			// determine if it is this player's turn
			if (player.index !== game.whosTurn) {
				console.log(`not ${player.name}'s turn`);
				throw new Error('error-not-your-turn');
			}
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
		 * Sends a catalogue of active games (optionally with completed games)
		 * pass ?active to get only active games. Note: does NOT send game
		 * onjects, rather a simple catalogue of Objects.
		 * @return {Promise} Promise to send a catalogue of games
		 */
		handle_games(req, res) {
			const server = this;
			const all = (req.query.all === "true");
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
		 * @return {Promise}
		 */
		handle_history(req, res) {
			const server = this;
			const scores = {};
			const wins = {};

			return this.db.keys()
			.then(keys => keys.map(
				key => server.games[key] || this.db.get(key, Game.classes)))
			.then(promises => Promise.all(promises))
			.then(games => games
				  .filter(game => game.ended)
				  .map(game => {
					  const winner = game.getWinner();
					  if (wins[winner.name])
						  wins[winner.name]++;
					  else
						  wins[winner.name] = 1;
					  game.players.map(
						  player => {
							  if (scores[player.name])
								  scores[player.name] += player.score;
							  else
								  scores[player.name] = player.score;
						  });
				  }))
			.then(() => res.send({ scores: scores, wins: wins }))
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
				res.send(keys);
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
			.then(editions => res.send(
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
			.then(keys => res.send(keys))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for POST /sendTurnReminders
		 * Email reminders to next human player in each game
		 */
		handle_sendTurnReminders(req, res) {
			console.log('Sending turn reminders');
			const surly = `${req.protocol}://${req.get('Host')}`;
			this.db.keys()
			.then(keys => keys.map(
				key => this.games[key] || this.db.get(key, Game.classes)))
			.then(promises => Promise.all(promises))
			.then(games => Promise.all(games.map(
				game => game.emailReminder(surly,this.config))))
			.then(data => res.send(data.filter(o => o.name)))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for POST /newGame
		 * @return {Promise}
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
			.then(game => game.onLoad(this.db))
			.then(game => {
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

				// Pick a random tile from the bag
				game.whosTurn = Math.floor(Math.random() * game.players.length);

				game.time_limit = req.body.time_limit || 0;
				if (game.time_limit > 0)
					console.log(`\t${game.time_limit} minute time limit`);
				else
					console.log('\twith no time limit');

				console.log(game.toString());

				// Save the game when everything has been initialised
				// (asynchronously)
				game.save();

				game.emailInvitations(
					`${req.protocol}://${req.get('Host')}`,
					this.config);

				// Redirect back to control panel
				res.redirect('/html/games.html');
			})
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for /game/:gameKey/:playerKey, player joining a game.
		 * Sets a cookie in the response with the player key so future
		 * requests can be handled correctly.
		 * TODO: re-route to /join/:gameKey/:playerKey
		 * @return {Promise}
		 */
		handle_enterGame(req, res) {
			const gameKey = req.params.gameKey;
			const playerKey = req.params.playerKey;
			return this.loadGame(gameKey)
			.then(() => {
				console.log(`Player ${playerKey} Entering ${gameKey}`); 
				res.cookie(gameKey, playerKey, {
					path: '/;SameSite=Strict',
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
		 * asking for HTML respond with the HTML page for the game.
		 * TODO: split these into separate routes /gameJSON/:gameKey
		 * and /gameHTML/:gameKey, or simply route the HTML request to
		 * the static HTML
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
		 * Handler for GET /bestPlay/:gameKey/:playerKey
		 * Find the best play for the player, given the current board
		 * state. Note that it may not be their turn, that's OK, this is debug
		 * @return {Promise}
		 */
		handle_bestPlay(req, res) {
			const gameKey = req.params.gameKey;
			const playerKey = req.params.playerKey;
			return this.loadGame(gameKey)
			.then(game => {
				const player = game.getPlayerFromKey(playerKey);
				return Platform.findBestPlay(game, player.rack.tiles());
			})
			.then(play => res.send(Fridge.freeze(play)))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for POST /deleteGame/:gameKey
		 * Delete the game.
		 */
		handle_deleteGame(req, res) {
			const gameKey = req.params.gameKey;
			return this.loadGame(gameKey)
			.then(() => this.db.rm(gameKey))
			.then(() => res.send(`OK ${gameKey} deleted`))
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for POST /anotherGame/:gameKey
		 * Create another game with the same players.
		 */
		handle_anotherGame(req, res) {
			return this.loadGame(req.params.gameKey)
			.then(game => game.anotherGame())
			.catch(e => this.trap(e, res));
		}

		/**
		 * Handler for POST /command/:gameKey/:command
		 * Result is always a Turn object, though the actual content
		 * varies according to the command sent.
		 * @return {Promise} Promise that resolves to undefined.
		 */
		handle_command(req, res) {
			const gameKey = req.params.gameKey;
			// Get cookie set by handle_enterGame that identifies the player
			const playerKey = req.cookies[gameKey];
			return this.loadGame(gameKey)
			.then(game => {
				const player = game.getPlayerFromKey(playerKey);

				if (game.ended)
					return Promise.resolve();

				// The command name and arguments
				const command = req.body.command;
				const args = req.body.args ? JSON.parse(req.body.args) : null;
				
				console.log(`COMMAND ${command} player ${player.name} game ${game.key}`, args);

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
					this.checkTurn(player);
					promise = game.challenge();
					break;

				case 'takeBack':
					promise = game.takeBack('took-back');
					break;

				case 'confirmGameOver':
					promise = game.confirmGameOver('ended-game-over');
					break;

				default:
					throw Error(`unrecognized command: ${command}`);
				}

				return promise.then(turn => game.finishTurn(turn))
				.then(turn => {
					// Notify non-game monitors (games pages)
					this.updateMonitors();

					if (turn && turn.move) {
						// Respond with the new tile list for the
						// human player. This is only used for swap
						// and makeMove, and other info (such as robot
						// tile states) is sent using messaging.
						console.log('Sending new tiles', turn.move.replacements);
						res.send(Fridge.freeze(turn.move.replacements || []));
					} else
						res.send([]);
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
