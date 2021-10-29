/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

define('game/Game', [
	'platform',
	'dawg/Dictionary',
	'game/GenKey', 'game/Board', 'game/Bag', 'game/LetterBag', 'game/Edition',
	'game/Player', 'game/Square', 'game/Tile', 'game/Rack', 'game/Move',
	'game/Turn'
], (
	Platform,
	Dictionary,
	GenKey, Board, Bag, LetterBag, Edition,
	Player, Square, Tile, Rack, Move,
	Turn
) => {

	/**
	 * The Game object may be used server or browser side.
	 */
	class Game {

		/**
		 * A new game is constructed from scratch by
		 * ```
		 * new Game(...).create().then(game => { game.onLoad(db)...
		 * ```
		 * A game identified by key is loaded from a db by
		 * ```
		 * db.get(key, Game.classes).then(game => { game.onLoad(db)...
		 * ```
		 * @param edition edition *name*
		 * @param dictionary dictionary *name* (may be null)
		 */
		constructor(edition, dictionary) {
			/**
			 * The name of the ediiton.
			 * We don't keep a pointer to the Edition object so we can
			 * cheaply serialise and send to the games interface. 
			 * @member {string}
			 */
			this.edition = edition;

			/**
			 * We don't keep a pointer to the dictionary object so we can
			 * cheaply serialise and send to the games interface. We just
			 * keep the name of the relevant object.
			 * @member {string}
			 */
			this.dictionary = dictionary;

			/**
			 * List of Player, in order of player.index
			 * @member {Player[]}
			 * @private
			 */
			this.players = [];

			/**
			 * Key that uniquely identifies this game
			 * @member {string}
			 */
			this.key = GenKey();

			/**
			 * Epoch ms when this game was created
			 * @member {number}
			 * @private
			 */
			this.creationTimestamp = Date.now();

			/**
			 * Complete list of the turn history of this game
			 * List of Turn objects.
			 * @member {Turn[]}
			 */
			this.turns = [];

			/**
			 * Index of next player to play in this game
			 * @member {number}
			 */
			this.whosTurn = 0;

			/**
			 * Time limit for a play in this game.
			 * Default 0 means never time out.
			 * @member {number}
			 */
			this.time_limit = 0;

			/**
			 * Pointer to Board object
			 * @member {Board}
			 */
			this.board = null;

			/**
			 * Size of rack. Always the same as Edition.rackCount,
			 * kept because we don't hold a pointer to the Edition
			 * @member {number}
			 */
			this.rackSize = 0;

			/**
			 * LetterBag object
			 * @member {LetterBag}
			 */
			this.letterBag = null;
		}

		/**
		 * Promise to finish construction of a new Game.
		 * Load the edition and create the board and letter bag.
		 * Not done in the constructor because we need to return
		 * a Promise.
		 * @return {Promise} that resolves to this
		 */
		create() {
			// Can't be done in the constructor because we want to
			// return a Promise. Extending Promise so that the constructor
			// return a Promise would be semantically confusing.
			return this.getEdition(this.edition)
			.then(edo => {
				this.board = new Board(edo);
				this.letterBag = new LetterBag(edo);
				this.rackSize = edo.rackCount;
				return this;
			});
		}

		/**
		 * A game loaded by deserialisation has to know what DB it was
		 * loaded from so it knows where to save the game. The
		 * database and connections are not serialised, and must be
		 * reset.
		 * @param {Platform.Database} db the db to use
		 * @return {Promise} Promise that resolves to the game
		 */
		onLoad(db) {
			/**
			 * List of decorated sockets, We don't serialise these.
			 * @member {WebSocket[]}
			 * @private
			 */
			this._connections = [];

			/**
			 * Database containing this game. Not serialised.
			 * @member {Platform.Database}
			 * @private
			 */
			this._db = db;

			return Promise.resolve(this);
		}

		/**
		 * Add a player to the game, and give them an initial rack
		 * @param {Player} player
		 */
		addPlayer(player) {
			if (!this.letterBag)
				throw Error('Cannot addPlayer() before create()');
			this.players.push(player);
			player.joinGame(
				this.letterBag,
				this.rackSize,
				this.players.length - 1);
		}

		/**
		 * Get the player by index. Will throw if index is out of range.
		 * @param {number} index
		 * @return {Player} player
		 */
		getPlayer(index) {
			if (index < 0 || index >= this.players.length)
				throw Error(`No such player ${index}`);
			return this.players[index];
		}

		/**
		 * Get the the current player
		 * @return {Player} player
		 */
		getActivePlayer() {
			return this.getPlayer(this.whosTurn);
		}

		/**
		 * Get the last player before the current player
		 * @return {Player} player
		 */
		getLastPlayer() {
			return this.getPlayer((this.whosTurn + this.players.length - 1)
								  % this.players.length);
		}

		/**
		 * Get the player with key
		 * @param {string} player key
		 * @return {Player} player, or undefined if not found
		 */
		getPlayerFromKey(key) {
			return this.players.find(p => p.key === key);
		}

		/**
		 * Used for testing only.
		 * @param sboard string representation of a game {@link Board}
		 * @return {Promise} resolving to `this`
		 */
		loadBoard(sboard) {
			return this.getEdition(this.edition)
			.then(ed => this.board.parse(sboard, ed))
			.then(() => this);
		}

		/**
		 * Get the edition for this game, lazy-loading as necessary
		 * @return {Promise} resolving to an {@link Edition}
		 */
		getEdition() {
			return Edition.load(this.edition);
		}

		/**
		 * Get the dictionary for this game, lazy-loading as necessary
		 * @return {Promise} resolving to a {@link Dictionary}
		 */
		getDictionary() {
			if (this.dictionary)
				return Dictionary.load(this.dictionary);

			// Terminal, no point in translating
			return Promise.reject('Game has no dictionary');
		}

		/**
		 * Get the current winning score
		 * @return {number} points
		 */
		getWinningScore() {
			return this.players.reduce(
				(max, player) => Math.max(max, player.score), 0);
		}
		
		/**
		 * Get the current winner of the game. The game need not have
		 * ended.
		 * @return {Player} the current winner of the game
		 */
		getWinner() {
			const winningScore = this.getWinningScore();
			return this.players.find(p => p.score === winningScore);
		}

		/**
		 * If there is a player with no tiles, return them.
		 * @return {Player} the player with no tiles, or undefined
		 */
		getPlayerWithNoTiles() {
			return this.players.find(
				player => (player.rack.tiles().length === 0));
		}

		/**
		 * Determine when the last activity on the game happened. This
		 * is either the last time a turn was processed, or the creation time.
		 * @return {number} a time in epoch ms
		 */
		lastActivity() {
			if (this.turns.length > 0)
				return this.turns[this.turns.length - 1].timestamp;

			return this.creationTimestamp;
		}

		/**
		 * Get the board square at [col][row]
		 * @return {Square} at col,row
		 */
		at(col, row) {
			return this.board.at(col, row);
		}

		/**
		 * Simple summary of the game, for console output
		 * @return {string} debug description
		 */
		toString() {
			return `Game ${this.key} edition "${this.edition}" dictionary "${this.dictionary}" players [ ${this.players.map(p => p.toString()).join(', ')} ]`;
		}

		/**
		 * Promise to save the game
		 * @return {Promise} that resolves to the game when it has been saved
		 */
		save() {
			if (!this._db) return Promise.resolve();
			console.log(`Saving game ${this.key}`);
			return this._db.set(this.key, this)
			.then(() => this);
		}

		/**
		 * Send a message to just one player. Note that the player
		 * may be connected multiple times through different sockets.
		 * @param {Player} player
		 * @param {string} message to send
		 * @param {Object} data to send with message
		 */
		notifyPlayer(player, message, data) {
			if (this._connections)
				this._connections.forEach(
					socket => {
						if (socket.player === player)
							socket.emit(message, data);
						return false;
					});
		}

		/**
		 * Broadcast a message to all players. Note that a player
		 * may be connected multiple times, through different sockets.
		 * @param {string} message to send
		 * @param {Object} data to send with message
		 */
		notifyPlayers(message, data) {
			this._connections.forEach(socket => socket.emit(message, data));
		}

		/**
		 * Wrap up after a command handler. Log the command, determine
		 * whether the game has ended, save state and notify game
		 * listeners.
		 * @param {Turn} turn the Turn to finish
		 * @return {Promise} that resolves to the {@link Turn} when the
		 * game has been saved and all players have been notified.
		 */
		finishTurn(turn) {
			turn.timestamp = Date.now();

			// store turn log
			this.turns.push(turn);

			return this.save()
			.then(() => {
				//console.log('Notify turn', turn);
				this.notifyPlayers('turn', turn);

				// if the game has ended, send notification.
				// The Turn structure doesn't signal this
				if (this.ended) {
					console.log('Game over', this.ended);
					this.notifyPlayers('gameOverConfirmed', this.ended);
					return Promise.resolve();
				}

				console.log(`Player ${this.whosTurn}'s turn`);
				const nextPlayer = this.players[this.whosTurn];
				if (nextPlayer.isRobot) {
					// Does a player have nothing on their rack? If
					// so, the game is over because the computer
					// will never challenge their play.
					const pwn = this.getPlayerWithNoTiles();
					if (pwn) {
						this.ended = 'ended-game-over';
						this.stopTimers();
						this.notifyPlayers('gameOverConfirmed', this.ended);
						return this.confirmGameOver(this.ended);
					}

					// Play computer player(s)
					return this.autoplay(nextPlayer)
					// May recurse if the player after is also a robot
					.then(turn => this.finishTurn(turn));
				}

				nextPlayer.startTimer(
					this.time_limit * 60 * 1000,
					() => this.pass('timeout')
					.then(turn => this.finishTurn(turn)));

				return turn;
			});
		}

		/**
		 * Generate a list of player names (not including the nominated player)
		 * e.g. "Hugh, Pugh, Cuthbert and Dibble"
		 * @param {Player} player player to exclude from the list, optional
		 * @return {string} player names
		 */
		playerListText(player) {
			const names = [];
			for (let p of this.players) {
				if (p !== player)
					names.push(p.name);
			}
			const length = names.length;
			switch (length) {
			case 0:
				return '';
			case 1:
				return names[0];
			default:
				return names.slice(0, length - 1).join(', ')
				// no Oxford comma
				+ ` ${Platform.i18n('and')} ${names[length - 1]}`;
			}
		}

		/**
		 * Promise to email invitations to players due to play in this game
		 * @param {string} serverURL URL of the server for this game
		 * @param {Object} config configuration object
		 * @return {Promise} that resolves to a {string[]} of player names who
		 * were sent mail
		 */
		emailInvitations(serverURL, config) {
			if (!config.mail || !config.mail.transport)
				return Promise.reject('Mail is not configured');

			const url = `${serverURL}/game/${this.key}`;
			const promises = [];
			this.players.forEach(
				player => {
					if (!player.email)
						return;
					promises.push(player.emailInvitation(
						Platform.i18n('email-invite',
									  this.playerListText(player)),
						url,
						config));
				});
			return Promise.all(promises);
		}

		/**
		 * Promise to email reminders to the next player due to
		 * play in this game
		 * (English only, no i18n support)
		 * @param {string} serverURL URL of the server for this game
		 * @param {Object} config configuration object
		 * @return {Promise} that resolves to a simple object,
		 * { name:, email: }, if a mail was sent
		 */
		emailReminder(serverURL, config) {
			this.checkTimeout();
			if (this.ended)
				return Promise.resolve({});

			const player = this.players[this.whosTurn];
			const url = `${serverURL}/game/${this.key}`;
			if (player.email) {
				console.log(`Sending turn reminder email to ${player.email}`);
				// Robots can't have an email
				return player.emailInvitation(
					Platform.i18n('email-your-turn',
								  this.playerListText(player)),
					url,
					config)
				.then(() => { return {
					name: player.name, email: player.email }; });
			} else
				console.log(`${player} has no email`);
			return Promise.resolve({});
		}

		/**
		 * Check if the game has timed out due to inactivity.
		 * Sets the 'ended' status of the game if it has.
		 */
		checkTimeout() {
			// Take the opportunity to time out old games
			const ageInDays =
				  (Date.now() - this.lastActivity())
				  / 60000 / 60 / 24;
			if (ageInDays > 14) {
				console.log('Game timed out:',
							this.players.map(({ name }) => name));

				this.stopTimers();
				this.ended = 'ended-timed-out';
				this.save();
				console.log(`${this.key} has timed out`);
			}
		}

		/**
		 * Does player have an active connection to this game?
		 * @param {Player} player the player
		 * @return {WebSocket} a decorated socket, or null if not connected.
		 */
		getConnection(player) {
			if (!this._connections)
				return null;
			for (let socket of this._connections) {
				if (socket.player === player)
					return socket;
			}
			return null;
		}

		/**
		 * Notify players with a list of the currently connected players,
		 * as identified by their key.
		 */
		updateConnections() {
			this.notifyPlayers(
				'connections',
				this._connections.map(socket => socket.player.key));
		}

		/**
		 * Start the turn of the given player.
		 * @param {number} playerIndex the index of the player to get the turn
		 * @param {number} timeout timeout for this turn, if undefined, use
		 * the Game.time_limit
		 */
		startTurn(playerIndex, timeout) {
			console.log(`Starting ${this.players[playerIndex].name}'s turn`);
			this.whosTurn = playerIndex;
			if (this.time_limit && !this.ended) {
				this.players[playerIndex].startTimer(
					timeout || this.time_limit * 60 * 1000,
					() => this.pass('timeout')
					.then(turn => this.finishTurn(turn)));
			}
		}

		/**
		 * Create a simple structure describing a subset of the
		 * game state, for sending to the 'games' interface
		 * @return {Object} simple object with key game data
		 */
		catalogue() {
			this.checkTimeout();
			return {
				key: this.key,
				edition: this.edition,
				ended: this.ended,
				dictionary: this.dictionary,
				time_limit: this.time_limit,
				players: this.players.map(player => player.catalogue(this)),
				whosTurn: this.whosTurn,
				timestamp: this.lastActivity()
			};
		}

		/**
		 * Player is on the given socket, as determined from an incoming
		 * 'join'. Server side only.
		 * @param {WebSocket} socket the connecting socket
		 * @param {string} playerKey the key identifying the player
		 */
		connect(socket, playerKey) {

			// Make sure this is a valid (known) player
			const player = this.players.find(p => p.key === playerKey);
			if (!player) {
				console.log(`WARNING: player key ${playerKey} not found in game ${this.key}, cannot connect()`);
				return;
			}

			// If the player has an open connection, we bump it and
			// accept the new connection. The logic is if they are changing
			// device due to some issue (e.g. poor comms)
			const knownSocket = this.getConnection(player);
			if (knownSocket !== null) {
				console.log('WARNING:', player, 'already connected to', this);
			} else if (player.index == this.whosTurn && !this.ended)
				player.startTimer(this.time_limit * 60 * 1000,
								  () => this.pass('timeout')
								  .then(turn => this.finishTurn(turn)));

			// Player is connected. Decorate the socket. It may seem
			// rather cavalier, writing over the socket this way, but
			// it does simplify the code quite a bit.
			socket.game = this;
			socket.player = player;

			this._connections.push(socket);
			console.log(`${player} connected`);

			// Tell players that the player is connected
			this.updateConnections();

			if (!this.ended) {
				if (this.allPlayersReady())
					this.startTheClock();
				else
					this.notifyPlayers(
						'tick',
						{
							player: this.whosTurn,
							timeout: 0
						});
			}

			// Add disconnect listener
			const game = this;
			socket.on('disconnect', () => {
				console.log(`${socket.player.toString()} disconnected`);
				this._connections = this._connections.filter(
					sock => sock !== socket);
				game.updateConnections();
			});
		}

		/**
		 * Return true if the game is 'live' - all players connected
		 */
		allPlayersReady() {
			for (let player of this.players) {
				if (!player.isRobot && this.getConnection(player) === null)
					return false;
			}
			return true;
		}

		/**
		 * If the game has a time limit, start an interval timer to
		 * notify players of the remaining time for the player
		 * who's turn it is.
		 */
		startTheClock() {
			if (this.time_limit && !this._intervalTimer) {
				// Broadcast a ping every second
				this._intervalTimer = setInterval(() => {
					if (this.players[this.whosTurn].timeoutAt) {
						this.notifyPlayers(
							'tick',
							{
								player: this.whosTurn,
								timeout: this.players[this.whosTurn].timeoutAt
							});
					}
				}, 1000);
				console.log('Started tick timer', this._intervalTimer);
			}
		}

		/**
		 * Stop timers (game timeout timer and player timers)
		 */
		stopTimers() {
			if (this._intervalTimer) {
				console.log('Stopping timer');
				clearInterval(this._intervalTimer);
				this._intervalTimer = null;
			}
			this.players.forEach(player => player.stopTimer());
		}

		/**
		 * Check if the game is ended. This is done after any turn
		 * that could result in an end-of-game state i.e. 'makeMove',
		 * 'pass'.
		 * @private
		 * @return true if all players have passed twice
		 */
		allPassedTwice() {
			// determine whether the end has been reached
			return !this.players.find(p => p.passes < 2);
		}

		/**
		 * Handler for 'hint' request. This is NOT a turn handler.
		 * Asynchronously calculate a play for the given player, and
		 * notify all players that they requested a hint.
		 * @param {Player} player to get a hint for
		 */
		hint(player) {
			console.log(`Player ${player.name} asked for a hint`);

			let bestPlay = null;
			Platform.findBestPlay(this, player.rack.tiles(), data => {
				if (typeof data === 'string')
					console.log(data);
				else
					bestPlay = data;
			})
			.then(() => {
				const hint = {
					sender: 'chat-advisor'
				};
				if (!bestPlay)
					hint.text = 'chat-no-play';
				else {
					console.log(bestPlay);
					const start = bestPlay.placements[0];
					hint.text = 'chat-hint';
					const words = bestPlay.words.map(w => w.word).join(',');
					hint.args = [
						words, start.row + 1, start.col + 1, bestPlay.score
					];
				}

				// Tell the requesting player the hint
				this.notifyPlayer(player, 'message', hint);
				
				// Tell *everyone* that they asked for a hint
				this.notifyPlayers('message', {
					sender: 'chat-advisor',
					text: 'chat-hinted',
					args: [ player.name ]
				});
			})
			.catch(e => {
				console.log('Error', e);
				this.notifyPlayers(
					'message', {
						sender: 'chat-advisor',
						text: e.toString() });
			});
		}

		/**
		 * Toggle wantsAdvice on/off (browser side only)
		 * @param {Player} player who is being toggled
		 */
		toggleAdvice(player) {
			player.toggleAdvice();
			this.notifyPlayer(
				player, 'message',
				{
					sender: 'chat-advisor',
					text: 'chat-'
					+ (player.wantsAdvice
					   ? 'enabled' : 'disabled')
				});
		}

		/**
		 * Advise player as to what better play they might have been
		 * able to make.
		 * @param {Player} player a Player
		 * @param {number} theirScore score they got from their play
		 * @return {Promise} resolving to a {@link Turn}
		 */
		advise(player, theirScore) {
			console.log(`Computing advice for ${player.name} > ${theirScore}`);

			let bestPlay = null;
			return Platform.findBestPlay(this, player.rack.tiles(), data => {
				if (typeof data === 'string')
					console.log(data);
				else
					bestPlay = data;
			})
			.then(() => {
				if (bestPlay && bestPlay.score > theirScore) {
					console.log(`Better play found for ${player.name}`);
					const start = bestPlay.placements[0];
					const words = bestPlay.words.map(w => w.word).join(',');
					const advice = {
						sender: 'chat-advisor',
						text: 'chat-advice',
						args: [	words, start.row + 1, start.col + 1,
								bestPlay.score ]
					};
					this.notifyPlayer(player, 'message', advice);
				} else
					console.log(`No better plays found for ${player.name}`);
			})
			.catch(e => {
				console.log('Error', e);
			});
		}

		/**
		 * Handler for 'makeMove' command.
		 * @param {Move} move a Move (or the spec of a Move)
		 * @return {Promise} resolving to a {@link Turn}
		 */
		async makeMove(move) {
			if (!(move instanceof Move))
				move = new Move(move);

			const thisPlayer = this.whosTurn;
			const player = this.players[thisPlayer];
			player.stopTimer();

			console.log(`makeMove ${player.name}`, move);
			console.log(`Player's rack is ${player.rack}`);

			// Fire up a thread to generate advice and wait for it
			// to complete. We can't do this asynchronously because
			// the advice depends on the board state, which the move is
			// going to update.
			if (player.wantsAdvice)
				await this.advise(player, move.score);

			const game = this;

			// Move tiles from the rack to the board
			move.placements.forEach(placement => {
				const tile = player.rack.removeTile(placement);
				const square = game.board.at(placement.col, placement.row);
				square.placeTile(tile, true);
			});

			player.score += move.score;

			// Get new tiles to replace those placed
			for (let i = 0; i < move.placements.length; i++) {
				const tile = this.letterBag.getRandomTile();
				if (tile) {
					player.rack.addTile(tile);
					move.addReplacement(tile);
				}
			}

			console.log('New rack', player.rack.toString());

			console.log('words ', move.words);

			// Asynchronously check word and notify player if it
			// isn't found.
			this.getDictionary()
			.then(dict => {
				for (let w of move.words) {
					console.log('Checking ',w);
					if (!dict.hasWord(w.word)) {
						// Only want to notify the player
						this.notifyPlayer(
							player, 'message',
							{
								sender: 'chat-advisor',
								text: 'chat-word-not-found',
								args: [ w.word, dict.name ]
							});
					}
				}
			})
			.catch((e) => {
				console.log('Dictionary load failed', e);
			});

			// Record the move
			move.playerIndex = thisPlayer;
			move.remainingTime = player.remainingTime;
			this.previousMove = move;

			player.passes = 0;

			if (!this.ended) {
				if (this.allPassedTwice()) {
					this.stopTimers();
					this.ended = 'ended-all-passed-twice';
				} else
					this.startTurn((thisPlayer + 1) % this.players.length);
			}
			
			// Report the result of the turn
			const turn = new Turn(this, {
				type: 'move',
				player: thisPlayer,
				nextToGo: this.whosTurn,
				deltaScore: move.score,
				move: move
			});

			return Promise.resolve(turn);
		}
		
		/**
		 * Robot play for the given player
		 * @param {Player} player to play
		 * @return {Promise} resolving to a {@link Turn}
		 */
		autoplay(player) {
			let bestPlay = null;

			console.log(`Autoplaying ${player.name}`);
			return Platform.findBestPlay(
				this, player.rack.tiles(), data => {
					if (typeof data === 'string')
						console.log(data);
					else {
						bestPlay = data;
						console.log('Best', bestPlay);
					}
				})
			.then(() => {
				if (bestPlay)
					return this.makeMove(bestPlay);

				console.log(`${player.name} can't play, passing`);
				return this.pass('pass');
			});
		}

		/**
		 * Called when the game has been confirmed as over - the player
		 * following the player who just emptied their rack has confirmed
		 * they don't want to challenge.
		 * @return {Promise} resolving to a {@link Turn}
		 */
		confirmGameOver(reason) {
			this.ended = reason;
			console.log(`Finishing because ${reason}`);

			this.stopTimers();

			// Adjust scores for tiles left on racks
			let playerWithNoTiles;
			let pointsRemainingOnRacks = 0;
			const deltas = Array(this.players.length).fill(0);
			this.players.forEach(player => {
				const rackScore = player.rack.score();
				if (player.rack.tiles().length > 0) {
					deltas[player.index] -= rackScore;
					pointsRemainingOnRacks += rackScore;
				} else if (playerWithNoTiles)
					throw Error('Found more than one player with no tiles when finishing game');
				else
					playerWithNoTiles = player;
			});

			if (playerWithNoTiles)
				deltas[playerWithNoTiles.index] = pointsRemainingOnRacks;

			const turn = new Turn(this, {
				type: 'ended-game-over',
				player: this.whosTurn,
				deltaScore: deltas
			});
			return Promise.resolve(turn);
		}

		/**
		 * Undo the last move. This might be as a result of a player request,
		 * or the result of a challenge.
		 * @param {string} type the type of the takeBack; 'took-back'
		 * or 'challenge-won'
		 * @return {Promise} Promise resolving to a {@link Turn}
		 */
		takeBack(type) {
			// The UI ensures that 'took-back' can only be issued by the
			// previous player.
			// SMELL: Might a comms race result in it being issued by
			// someone else?
			const previousMove = this.previousMove;
			const prevPlayer = this.players[previousMove.playerIndex];

			delete this.previousMove;

			// Move tiles that were added to the rack as a consequence
			// of the previous move, back to the letter bag
			for (let newTile of previousMove.replacements) {
				const tile = prevPlayer.rack.removeTile(newTile);
				this.letterBag.returnTile(tile);
			}

			// Move placed tiles from the board back to the prevPlayer's rack
			for (let placement of previousMove.placements) {
				const boardSquare =
					  this.board.at(placement.col, placement.row);
				prevPlayer.rack.addTile(boardSquare.tile);
				boardSquare.placeTile(null);
			}
			prevPlayer.score -= previousMove.score;

			const challenger = this.whosTurn;
			if (type === 'took-back') {
				// A takeBack, not a challenge. Let that player go again,
				// but with just the remaining time from their move.
				this.startTurn(previousMove.playerIndex,
							   previousMove.remainingTime);
			}
			// else a successful challenge, does not move the player on.
			// Timer was cancelled during the challenge, and needs to be
			// restarted.
			else {
				// A successful challenge restarts the timer for the challenger
				// player from the beginning
				this.startTurn(challenger, this.time_limit * 60 * 1000);
			}

			const turn = new Turn(this, {
				type: type,
				player: previousMove.playerIndex,
				nextToGo: this.whosTurn,
				deltaScore: -previousMove.score,
				move: previousMove,
				challenger: challenger
			});

			return Promise.resolve(turn);
		}

		/**
		 * Handler for 'pass' command.
		 * Player wants to (or has to) miss their move. Either they
		 * can't play, or challenged and failed.
		 * @param {string} type pass type, 'pass' or 'challenge-failed'
		 * @return {Promise} resolving to a {@link Turn}
		 */
		pass(type) {
			const passingIndex = this.whosTurn;
			const passingPlayer = this.players[passingIndex];
			passingPlayer.stopTimer();
			delete this.previousMove;
			passingPlayer.passes++;

			if (this.allPassedTwice()) {
				this.stopTimers();
				this.ended = 'ended-all-passed-twice';
			} else {
				const nextPlayer = (passingIndex + 1) % this.players.length;
				this.startTurn(nextPlayer);
			}
			return Promise.resolve(new Turn(
				this, {
					type: type,
					player: passingIndex,
					nextToGo: this.whosTurn
				}));
		}

		/**
		 * Handler for 'challenge' command.
		 * Check the words created by the previous move are in the dictionary
		 * @return {Promise} resolving to a {@link Turn}
		 */
		challenge() {
			// Cancel any outstanding timer until the challenge is resolved
			this.players[this.whosTurn].stopTimer();

			return this.getDictionary()
			.catch(() => {
				console.log('No dictionary, so challenge always succeeds');
				return this.takeBack('challenge-won');
			})
			.then(dict => {
				const bad = this.previousMove.words
					  .filter(word => !dict.hasWord(word.word));

				if (bad.length > 0) {
					// Challenge succeeded
					console.log(`Bad Words: ${bad.join(',')}`);
					return this.takeBack('challenge-won');
				}

				// challenge failed, this player loses their turn
				return this.pass('challenge-failed');
			});
		}

		/**
		 * Handler for swap command.
		 * Player wants to swap their current rack for a different
		 * letters.
		 * @param {Tile[]} tiles list of Tile to swap
		 * @return {Promise} resolving to a {@link Turn}
		 */
		swap(tiles) {
			const swappingIndex = this.whosTurn;
			const swappingPlayer = this.players[swappingIndex];
			swappingPlayer.stopTimer();

			if (this.letterBag.remainingTileCount() < tiles.length)
				// Terminal, no point in translating
				throw Error(`Cannot swap, bag only has ${this.letterBag.remainingTileCount()} tiles`);

			delete this.previousMove;
			swappingPlayer.passes++;

			// Construct a move to record the results of the swap
			const move = new Move();

			// First get some new tiles
			// Scrabble Rule #7: You may use a turn to exchange all,
			// some, or none of the letters. To do this, place your
			// discarded letter(s) facedown. Draw the same number of
			// letters from the pool, then mix your discarded
			// letter(s) into the pool.
			let tile;
			for (tile of tiles)
				move.addReplacement(this.letterBag.getRandomTile());

			// Return discarded tiles to the letter bag
			for (tile of tiles) {
				const removed = swappingPlayer.rack.removeTile(tile);
				if (!removed)
					// Terminal, no point in translating
					throw Error(`Cannot swap, player rack does not contain letter ${tile.letter}`);
				this.letterBag.returnTile(removed);
			}

			// Place new tiles on the rack
			for (tile of move.replacements)
				swappingPlayer.rack.addTile(tile);

			const nextIndex = (swappingIndex + 1) % this.players.length;
			this.startTurn(nextIndex);

			return Promise.resolve(
				new Turn(this,
						 {
							 type: 'swap',
							 player: swappingIndex,
							 nextToGo: nextIndex,
							 move: move
						 }));
		}

		/**
		 * Handler for 'anotherGame' command
		 * @return {Promise} resolving to undefined
		 */
		anotherGame() {
			if (this.nextGameKey) {
				console.log(`another game already created: old ${this.key} new ${this.nextGameKey}`);
				return Promise.resolve(); // NOP
			}

			console.log(`Create game to follow ${this.key}`);
			// re-order players so they play in score order
			const newPlayers = this.players.slice().sort((a, b) => {
				return a.score > b.score ? -1 : a.score < b.score ? 1 : 0;
			}).map(p => new Player(p));
			return new Game(this.edition, this.dictionary)
			.create()
			.then(newGame => {
				newGame.onLoad(this._db);
				newPlayers.forEach(p => newGame.addPlayer(p));
				newGame.time_limit = this.time_limit;
				this.nextGameKey = newGame.key;
				newGame.save();
				this.save();
				console.log(`Created follow-on game ${newGame.key}`);
				this.notifyPlayers('nextGame', newGame.key);
			});
		}

		/**
		 * Create the DOM for the player table
		 * @param {Player} thisPlayer the player for whom the DOM is
		 * being generated
		 */
		createPlayerTableDOM(thisPlayer) {
			const $tab = $('<table></table>');
			this.players.forEach(
				p => $tab.append(p.createScoreDOM(thisPlayer)));
			return $tab;
		}
	}

	Game.classes = [ LetterBag, Square, Board, Tile, Rack,
					 Game, Player, Move, Turn ];

	return Game;
});

