/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

define('game/Game', [
	'platform/Platform',
	'dawg/Dictionary',
	'game/GenKey', 'game/Board', 'game/Bag', 'game/LetterBag', 'game/Edition',
	'game/Player', 'game/Square', 'game/Tile', 'game/Rack', 'game/Move',
	'game/Turn'
], (
	Platform,
	Dictionary,
	GenKey, Board, Bag, LetterBag, Edition,
	Player, Square, Tile, Rack, Move,
	Turn) => {

	/**
	 * The Game object may be used server or browser side.
	 */
	class Game {

		/**
		 * @param edition edition *name*
		 * @param dictionary dictionary *name* (may be null)
		 */
		constructor(edition, dictionary) {
			// Don't keep a pointer to the edition object so we can
			// cheaply serialise and send to the games interface. Just
			// keep the name of the relevant object.
			this.edition = edition;
			this.dictionary = dictionary;
			this.players = [];
			this.key = GenKey();
			this.creationTimestamp = Date.now();
			this.turns = [];
			this.whosTurn = 0;
			this.time_limit = 0; // never time out
			this.board = null;
			this.rackSize = 0;
			this.letterBag = null;
			// List of decorated sockets, We don't serialise these
			this._connections = [];
			this._db = null;
		}

		/**
		 * Finish construction of a new Game.
		 * Load the edition and create the board and letter bag.
		 * Can't be done in the constructor because we have to
		 * return a Promise.
		 * @return a Promise that resolves to this.
		 */
		create() {
			return Edition.load(this.edition)
			.then(edo => {
				this.board = new Board(edo);
				this.letterBag = new LetterBag(edo);
				this.rackSize = edo.rackCount;
				return this;
			});
		}

		/**
		 * Set the database to use to save the game. The database is not
		 * serialised, and has to be reset when a game is loaded by
		 * deserialisation.
		 * @param db a 
		 */
		setDB(db) {
			this._db = db;
			this._connections = [];
		}

		/**
		 * Add a player to the game, and give them an initial rack
		 * @param player a Player
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
		 * Get the player with key
		 */
		getPlayerFromKey(key) {
			return this.players.find(p => p.key === key);
		}

		/**
		 * Used for testing only.
		 * @param sboard string representation of a game board (@see game/Board)
		 * @return Promise that resolves to this
		 */
		loadBoard(sboard) {
			return Edition.load(this.edition)
			.then(ed => this.board.parse(sboard, ed))
			.then(() => this);
		}

		/**
		 * Get the edition for this game, lazy-loading as necessary
		 * @return Promise resolving to an Edition.
		 */
		getEdition() {
			return Edition.load(this.edition);
		}

		/**
		 * Get the dictionary for this game, lazy-loading as necessary
		 * @return Promise resolving to a Dictionary
		 */
		getDictionary() {
			if (this.dictionary)
				return Dictionary.load(this.dictionary);

			// Terminal, no point in translating
			return Promise.reject('Game has no dictionary');
		}

		/**
		 * Get the winner of the game, if it has ended
		 * @return the winner of the game, or undefined if the
		 * game has not ended
		 */
		getWinner() {
			let winningScore = -10000;
			this.players.forEach(
				player => winningScore = Math.max(winningScore, player.score));
			return this.players.find(p => p.score === winningScore);
		}

		/**
		 * Determine when the last activity on the game happened. This
		 * is either the last time a turn was processed, or the creation time.
		 * @return a time in epoch ms
		 */
		lastActivity() {
			if (this.turns.length > 0)
				return this.turns[this.turns.length - 1].timestamp;

			return this.creationTimestamp;
		}

		/**
		 * Robot play for the given player
		 * @return a Promise resolving to a Turn
		 */
		autoplay(player) {
			let bestPlay = null;

			console.log(`autoplay ${player.name}`);
			return Platform.findBestPlay(
				this, player.rack.tiles(), data => {
					if (typeof data === 'string')
						console.log(data);
					else {
						bestPlay = data;
						console.log('Best', bestPlay.toString());
					}
				})
			.then(() => {
				if (bestPlay)
					return this.makeMove(bestPlay);

				console.log(`${this.name} can't play, passing`);
				return this.pass('pass');
			});
		}

		/**
		 * Get the board square at [col][row]
		 */
		at(col, row) {
			return this.board.at(col, row);
		}

		/**
		 * Simple summary of the game, for console output
		 */
		toString() {
			return `Game ${this.key} edition "${this.edition}" dictionary "${this.dictionary}" players [ ${this.players.map(p => p.toString()).join(', ')} ]`;
		}

		/**
		 * Return a promise to save the game
		 */
		save() {
			if (!this._db) return Promise.resolve();
			console.log(`Saving game ${this.key}`);
			return this._db.set(this.key, this);
		}

		/**
		 * Send a message to just one player. Note that the player
		 * may be connected multiple times, so it's not enough to
		 * send the message to one socket.
		 */
		notifyPlayer(player, message, data) {
			const socket = this.getConnection(player);
			if (socket)
				socket.emit(message, data);
		}

		/**
		 * Broadcast a message to all players
		 */
		notifyPlayers(message, data) {
			this._connections.forEach(
				socket => socket.emit(message, data));
		}

		/**
		 * Get the player object for the player identified by the key
		 * @param playerKey the key to look up
		 * @return a Promise that resolves to { game:, player: } if the
		 * polayer is found.
		 */
		lookupPlayer(playerKey) {
			const player = this.players.find(p => (p.key == playerKey));
			if (player)
				return Promise.resolve({
					game: this,
					player: player
				});
			else
				return Promise.reject('error-player-does-not-exist');
		}

		/**
		 * Before processing a Move instruction (pass or play) check that
		 * the given player is in this game, and it's their turn.
		 * @param player a Player object
		 * @return a Promise resolving to this game, rejected if it isn't
		 * the players turn
		 */
		checkTurn(player) {
			if (this.ended) {
				console.log(`Game ${this.key} has ended:`, this.ended);
				return Promise.reject('error-game-has-ended');
			}

			// determine if it is this player's turn
			if (player === this.players[this.whosTurn])
				return Promise.resolve(this);

			console.log(`not ${player.name}'s turn`);
			return Promise.reject('error-not-your-turn');
		}

		/**
		 * Wrap up after a command handler. Log the command, determine
		 * whether the game has ended, save state and notify game
		 * listeners.
		 * @param turn a Turn object
		 * @return a Promise that resolves when the game has been saved and
		 * all players have been notified.
		 */
		finishTurn(turn) {
			turn.timestamp = Date.now();

			// store turn log
			this.turns.push(turn);

			return this.save()
			.then(() => {
				//console.log('Notify turn', turn);
				this.notifyPlayers('turn', turn);

				// if the game has ended, send extra notification with
				// final scores
				if (this.ended) {
					console.log('Game over', this.ended);
					this.notifyPlayers('gameEnded', this.ended);
					return Promise.resolve();
				}
				console.log(`Player ${this.whosTurn}'s turn`);
				const nextPlayer = this.players[this.whosTurn];
				if (nextPlayer.isRobot) {
					// Play computer player(s)
					return this.autoplay(nextPlayer)
					// May recurse if the player after is also a robot
					.then(turn => this.finishTurn(turn));
				}
				nextPlayer.startTimer(
					this.time_limit * 60 * 1000,
					() => this.pass('timeout')
					.then(turn => this.finishTurn(turn)));
				return Promise.resolve();
			});
		}

		/**
		 * Generate a game reference string addressed to the given player
		 * in email (English only, no i18n support)
		 */
		emailJoinProse(player) {
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
				+ ` and ${names[length - 1]}`;
			}
		}

		/**
		 * Send email invitations to players due to play in this game
		 */
		emailInvitations(config) {
			this.players.forEach(
				player => {
					if (!player.email)
						return;
					player.sendInvitation(
						'You have been invited to play with '
						+ this.emailJoinProse(player),
						config);
				});
		}

		/**
		 * Send email reminders to the next player due to play in this game
		 * (English only, no i18n support)
		 */
		emailTurnReminder(config) {
			if (this.ended)
				return;

			const ageInDays =
				  (Date.now() - this.lastActivity())
				  / 60000 / 60 / 24;
			if (ageInDays > 14) {
				console.log('Game timed out:',
							this.players.map(({ name }) => name));

				this.ended = { reason: 'ended-timed-out' };
				this.save();
				return;
			}
			const player = this.players[this.whosTurn];
			if (player.email)
				player.sendInvitation(
					'It is your turn in your game with '
					+ this.emailJoinProse(player),
					config);
		}

		/**
		 * Does player have an active connection to this game?
		 * @return a decorated socket, or null if not connected.
		 */
		getConnection(player) {
			if (!this._connections)
				return null;
			for (let socket of this._connections) {
				if (socket.player == player)
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
		 * Pass the turn to the given player
		 * @param index the index of the player to get the turn
		 * @param timeout if undefined, use the game time limit
		 */
		startTurn(index, timeout) {
			this.whosTurn = index;
			console.log(`Starting ${this.players[index].name}'s turn`);
			if (this.time_limit && !this.ended) {
				this.players[index].startTimer(
					timeout || this.time_limit * 60 * 1000,
					() => this.pass('timeout')
					.then(turn => this.finishTurn(turn)));
			}
		}

		/**
		 * Create simple structure describing the game, for use in the
		 * games interface
		 */
		catalogue() {
			return {
				key: this.key,
				edition: this.edition,
				ended: this.ended,
				dictionary: this.dictionary,
				time_limit: this.time_limit,
				players: this.players.map(player => player.catalogue(this)),
				nextToPlay: this.whosTurn,
				timestamp: this.lastActivity()
			};
		}

		/**
		 * Player is on the given socket, as determined from an incoming
		 * 'join'. Server side only.
		 * @param socket the connecting socket
		 * @param playerKey the key identifying the player
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

			if (this.allPlayersReady() && !this.ended)
				this.startTheClock();
			else
				this.notifyPlayers(
					'tick',
					{
						player: this.whosTurn,
						timeout: 0
					});

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
		 * Stop the clock timer, if it is running.
		 */
		stopTheClock() {
			if (this._intervalTimer) {
				console.log('Stopping timer');
				clearInterval(this._intervalTimer);
				this._intervalTimer = null;
			}
		}

		/**
		 * Check if the game is ended. This is done after any turn
		 * that could result in an end-of-game state i.e. 'makeMove',
		 * 'pass',
		 */
		checkGameState() {
			let reason;

			// determine whether the end has been reached
			if (!this.players.find(p => p.passes < 2))
				reason = 'ended-all-passed-twice';

			else if (this.letterBag.isEmpty() &&
					 this.players.find(p => p.rack.isEmpty()))
				reason = 'ended-game-over';
			else
				return;

			console.log(`Finishing because ${reason}`);
			this.stopTheClock();
			this.players.forEach(player => player.stopTimer());

			// Tally scores
			let playerWithNoTiles;
			let pointsRemainingOnRacks = 0;
			this.players.forEach(player => {
				const tilesLeft = [];
				let rackScore = 0;
				player.rack.forEachSquare(square => {
					if (square.tile) {
						rackScore += square.tile.score;
						if (!square.tile.isBlank)
							tilesLeft.push(square.tile.letter);
					}
				});
				if (tilesLeft.length > 0) {
					player.score -= rackScore;
					player.tally = -rackScore;
					player.tilesLeft = tilesLeft;
					pointsRemainingOnRacks += rackScore;
				} else {
					if (playerWithNoTiles)
						throw Error('Found more than one player with no tiles when finishing game');
					playerWithNoTiles = player;
				}
			});

			if (playerWithNoTiles) {
				playerWithNoTiles.score += pointsRemainingOnRacks;
				playerWithNoTiles.tally = pointsRemainingOnRacks;
			}

			let winningScore = -10000;
			this.players.forEach(
				player => winningScore = Math.max(winningScore, player.score));

			this.ended = {
				reason: reason, // i18n message key
				winningScore: winningScore,
				players: this.players.map(player => {
					return {
						player: player.index,
						score: player.score,
						tally: player.tally,
						tilesLeft: player.tilesLeft
					};
				})
			};
		}

		/**
		 * Handler for 'hint' message. This is NOT a turn handler
		 * Calculate a play for the given player
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
				// Tell the player the hint
				this.notifyPlayer(player, 'message', hint);
				
				// Tell *everyone* who asked for a hint
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
		 * Advise player as to what better play they might have been
		 * able to make.
		 * @param player a Player
		 * @param theirScore score they got from their play
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
		 * @param move a Move
		 * @return a Promise resolving to a Turn
		 */
		async makeMove(move) {
			const player = this.players[this.whosTurn];
			player.stopTimer();

			console.log(`makeMove player ${player.index} `, move.toString());
			console.log(`Player's rack is ${player.rack}`);

			// Fire up a thread to generate advice
			if (player.wantsAdvice)
				await this.advise(player, move.score);

			const game = this;

			// Move tiles from the rack to the board
			move.placements.forEach(placement => {
				const tile = player.rack.removeTile(placement);
				game.board.at(placement.col, placement.row)
				.placeTile(tile, true);
			});

			player.score += move.score;

			// get new tiles to replace those placed
			const newTiles = [];
			for (let i = 0; i < move.placements.length; i++) {
				const tile = this.letterBag.getRandomTile();
				if (tile) {
					player.rack.addTile(tile);
					newTiles.push(tile);
				}
			}

			console.log('New rack', player.rack.toString());

			console.log('words ', move.words);
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

			this.previousMove = {
				placements: move.placements,
				newTiles: newTiles,
				score: move.score,
				player: player.index,
				remainingTime: player.remainingTime,
				words: move.words.map(w => w.word)
			};
			player.passes = 0;

			this.startTurn((this.whosTurn + 1) % this.players.length);

			const turn = new Turn(this, 'move', player, move.score);
			turn.move = move;
			turn.newTiles = newTiles;

			this.checkGameState();

			return Promise.resolve(turn);
		}

		/**
		 * Handler for 'takeBack' command.
		 * Undo the last move. This might be as a result of a player request,
		 * or the result of a challenge.
		 * @param type the type of the takeBack; 'took-back' or 'challenge-won'
		 * @return a Promise resolving to a Turn
		 */
		takeBack(type) {
			// The UI ensures that 'took-back' can only be issued by the
			// previous player.
			// SMELL: Might a comms race result in it being issued by
			// someone else?
			const previousMove = this.previousMove;
			const loser = this.players[previousMove.player];

			delete this.previousMove;

			// Move tiles that were added to the rack as a consequence
			// of the previous move, back to the letter bag
			for (let newTile of previousMove.newTiles) {
				const tile = loser.rack.removeTile(newTile);
				this.letterBag.returnTile(tile);
			}

			// Move placed tiles from the board back to the loser's rack
			for (let placement of previousMove.placements) {
				const boardSquare =
					  this.board.at(placement.col, placement.row);
				loser.rack.addTile(boardSquare.tile);
				boardSquare.placeTile(null);
			}
			loser.score -= previousMove.score;

			const challenger = this.whosTurn;
			if (type === 'took-back') {
				// A takeBack, not a challenge. Let that player go again,
				// but with just the remaining time from their move.
				this.startTurn(previousMove.player, previousMove.remainingTime);
			}
			// else a successful challenge, does not move the player on.
			// Timer was cancelled during the challenge, and needs to be
			// restarted.
			else {
				// A successful challenge restarts the timer for the challenging
				// player from the beginning
				this.startTurn(this.whosTurn, this.time_limit * 60 * 1000);
			}

			const turn = new Turn(this, type, loser, -previousMove.score);
			turn.move = previousMove;
			turn.newTiles = previousMove.newTiles;
			turn.challenger = challenger;

			return Promise.resolve(turn);
		}

		/**
		 * Handler for 'pass' command.
		 * Player wants to (or has to) miss their move. Either they
		 * can't play, or challenged and failed.
		 * @param type pass type, 'pass' or 'challenge-failed'
		 * @return a Promise resolving to a Turn
		 */
		pass(type) {
			const player = this.players[this.whosTurn];
			player.stopTimer();
			delete this.previousMove;
			player.passes++;

			this.checkGameState();
			this.startTurn((this.whosTurn + 1) % this.players.length);

			return Promise.resolve(new Turn(this, type, player, 0));
		}

		/**
		 * Handler for 'challenge' command.
		 * Check the words created by the previous move are in the dictionary
		 * @return Promise resolving to a Turn
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
					  .filter(word => !dict.hasWord(word));

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
		 * @param tiles list of Tile to swap
		 * @return Promise resolving to a Turn
		 */
		swap(tiles) {
			const player = this.players[this.whosTurn];
			player.stopTimer();

			if (this.letterBag.remainingTileCount() < tiles.length)
				// Terminal, no point in translating
				throw Error(`Cannot swap, bag only has ${this.letterBag.remainingTileCount()} tiles`);

			delete this.previousMove;
			player.passes++;

			// First get some new tiles
			const newTiles = [];
			let tile;
			for (tile of tiles)
				newTiles.push(this.letterBag.getRandomTile());

			// Return selected tiles to the letter bag
			for (tile of tiles) {
				const removed = player.rack.removeTile(tile);
				if (!removed)
					// Terminal, no point in translating
					throw Error(`Cannot swap, player rack does not contain letter ${tile.letter}`);
				this.letterBag.returnTile(removed);
			}

			// Place new tiles on the rack
			for (tile of newTiles)
				player.rack.addTile(tile);

			this.startTurn((this.whosTurn + 1) % this.players.length);
			const turn = new Turn(this, 'swap', player, 0);
			turn.newTiles = newTiles;
			return Promise.resolve(turn);
		}

		/**
		 * Handler for 'anotherGame' command
		 * @return Promise resolving to a (null) Turn
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
			return new Game(this.edition, this.dictionary).create()
			.then(newGame => {
				newPlayers.forEach(p => newGame.addPlayer(p));
				newGame.time_limit = this.time_limit;
				this.ended.nextGameKey = newGame.key;
				newGame._db = this._db;
				newGame.save();
				this.save();
				console.log(`Created follow-on game ${newGame.key}`);
				this.notifyPlayers('nextGame', newGame.key);
			});
		}

		/**
		 * Create the DOM for the player table
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

