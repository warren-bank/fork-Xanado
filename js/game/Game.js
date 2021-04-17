/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

define("game/Game", [ "game/GenKey", "game/Board", "game/Bag", "game/LetterBag", "game/Edition", "game/Player", "dawg/Dictionary", 'game/Square', 'game/Tile', 'game/Rack', 'game/Move', 'game/Turn', "game/findBestPlay"/*Controller"*/ ], (GenKey, Board, Bag, LetterBag, Edition, Player, Dictionary, Square, Tile, Rack, Move, Turn, findBestPlay) => {

	/**
	 * The Game object could be used server or browser side, but in the
	 * event is only used on the server, which is responsible for management
	 * of all the active games.
	 */
	class Game {

		/**
		 * @param edition edition *name*
		 * @param players list of Player
		 * @param dictionary dictionary *name* (may be null)
		 */
		constructor(edition, players, dictionary) {
			// Don't keep a pointer to the edition object so we can
			// cheaply serialise and send to the games interface
			this.edition = edition;
			this.dictionary = dictionary;
			this.players = players;
			this.key = GenKey();
			this.creationTimestamp = new Date().toISOString();
			this.turns = [];
			this.whosTurn = 0;
			this.time_limit = 0; // never time out
			this.nextTimeout = 0;
			this.connections = [];
			this.saver = null;
		}

		/**
		 * Get the player with key
		 */
		getPlayerFromKey(key) {
			return this.players.find(p => p.key === key);
		}

		/**
		 * Load the edition and complete setup of a new Game.
		 * Server side only; during deserialisation on the client side
		 * the board and letterbag are set up already.
		 */
		load() {
			return Edition.load(this.edition)
			.then(edo => {
				this.board = new Board(edo);
				this.letterBag = new LetterBag(edo);
				// Add players
				for (let i = 0; i < this.players.length; i++) {
					this.players[i].joinGame(this.letterBag, i);
					console.log(`${this.players[i].name} is player ${i}`);
				}
				return this;
			});
		}

		/**
		 * Cancel current timeout
		 */
		stopTimeout() {
			if (this.timer) {
				clearTimeout(this.timer);
				delete this.timer;
				this.nextTimeout = 0;
			}
		}

		/**
		 * Used for testing only
		 */
		loadBoard(sboard) {
			return Edition.load(this.edition)
			.then(ed => this.board.parse(sboard, ed));
		}

		getDictionary() {
			if (this.dictionary)
				return Dictionary.load(this.dictionary);

			// Terminal, no point in translating
			return Promise.reject('Game has no dictionary');
		}

		/**
		 * Set a play timeout for the player if the game time limit is set
		 * @return the clock time when the timeout will expire
		 */
		startTimeout(player) {
			if (this.time_limit === 0)
				return this.nextTimeout;

			this.stopTimeout();
			let timeout = this.time_limit * 60 * 1000;
			let timeoutAt = Date.now() + timeout;
			console.log(`${player.name}'s go will time out in ${this.time_limit} minutes at ${timeoutAt}`);
			let game = this;
			setTimeout(() => {
				console.log(`${player.name} has timed out at ${Date.now()}`);
				game.pass(player, 'timeout')
				.then(r => game.updateGameState(player, r));
			}, timeout + 10000);
			this.nextTimeout = Date.now() + timeout;
			return this.nextTimeout;
		}

		lastActivity() {
			if (this.turns.length
				&& this.turns[this.turns.length - 1].timestamp) {
				return new Date(this.turns[this.turns.length - 1].timestamp);
			} else if (this.creationTimestamp) {
				return new Date(this.creationTimestamp);
			} else {
				return new Date(0);
			}
		}

		/**
		 * Get the board square at [col][row]
		 */
		at(col, row) {
			return this.board.squares[col][row];
		}

		toString() {
			return `${this.key} game of ${this.players.length} players edition ${this.edition} dictionary ${this.dictionary}\n` + this.players;
		}

		/**
		 * Return a promise to save the game
		 */
		save() {
			return this.saver ? this.saver(this) : Promise.resolve();
		}

		// Send a message to all players connected to this game
		notifyListeners(message, data) {
			this.connections.forEach(socket => {
				socket.emit(message, data);
			});
		}

		/**
		 * Get the player object for the player identified by the key
		 * @param key the key to look up
		 * @return the player object, or null if the player isn't found
		 */
		lookupPlayer(playerKey) {
			let player = this.players.find(p => (p.key == playerKey));
			if (player)
				return Promise.resolve({
					game: this,
					player: player
				});
			else
				return Promise.reject('error-player-does-not-exist');
		}

		/**
		 * Check that the given player is in this game, and it's their turn.
		 * Returned promise is rejected if it isn't the players turn or
		 * the game is not playable
		 */
		checkTurn(player) {
			if (this.ended) {
				console.log(`Game ${this.key} has ended:`, this.ended);
				return Promise.reject('error-game-has-ended');
			}

			// determine if it is this player's turn
			if (player !== this.players[this.whosTurn]) {
				console.log(`not ${player.name}'s turn`);
				return Promise.reject('error-not-your-turn');
			}
			return Promise.resolve(this, player);
		}

		remainingTileCounts() {
			return {
				letterBag: this.letterBag.remainingTileCount(),
				players: this.players.map(player => {
					let count = 0;
					for (const square of player.rack.squares) {
						if (square.tile) count++;
					}
					return count;
				})
			};
		}

		/**
		 * Wrap up after a command handler. Log the command, determine
		 * whether the game has ended, save state and notify game
		 * listeners.
		 */
		updateGameState(player, turn) {
			turn.timestamp = Date.now();

			// store turn log
			this.turns.push(turn);

			this.save()
			.then(() => {
				//console.log("Notify turn", turn);
				this.notifyListeners('turn', turn);

				// if the game has ended, send extra notification with
				// final scores
				if (this.ended) {
					console.log("Game over", this.ended);
					this.notifyListeners('gameEnded', this.ended);
				} else {
					console.log(`Player ${this.whosTurn}'s turn`);
					const p = this.players[this.whosTurn];
					if (p.isRobot) {
						// Play computer player(s)
						p.autoplay(this)
						.then(turn => {
							console.log(`${p} played, updateGameState`);
							this.updateGameState(p, turn);
							// If we do this, computer turns are notified twice.
							//this.notifyListeners('turn', turn);
						});
					} else if (this.isConnected(p))
						turn.timeout = this.startTimeout(p);
				}
			});
		}

		/**
		 * Generate a game reference string addressed to the given player
		 * in email (English only, no i18n support)
		 */
		emailJoinProse(player) {
			let names = [];
			for (let p of this.players) {
				if (p !== player)
					names.push(p.name);
			}
			let length = names.length;
			switch (length) {
			case 0:
				return "";
			case 1:
				return names[0];
			default:
				return names.slice(0, length - 1).join(", ")
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
						"You have been invited to play with "
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
				  (new Date() - this.lastActivity())
				  / 60000 / 60 / 24;
			if (ageInDays > 14) {
				console.log('Game timed out:',
							this.players.map(({ name }) => name));
				this.ended = { reason: 'timed out' };
				this.save();
				return;
			}
			const player = this.players[this.whosTurn];
			if (player.email)
				player.sendInvitation(
					"It is your turn in your this with "
					+ this.emailJoinProse(player),
					config);
		}

		/**
		 * Does player have an active connection to this game?
		 */
		isConnected(player) {
			for (let connection of this.connections) {
				if (connection.player == player)
					return true;
			}
			return false;
		}

		/**
		 * Player is on the given socket, as determined from an incoming
		 * 'join'
		 * @param socket the connecting socket
		 * @param playerKey the key identifying the player
		 */
		newConnection(socket, playerKey) {

			let player;
			for (let knownPlayer of this.players) {
				if (knownPlayer.key == playerKey) {
					// Player is known to the game. A reconnection.
					player = knownPlayer;
				} else {
					for (let connection of this.connections) {
						if (connection.player == knownPlayer) {
							// knownPlayer is already connected.
							// SMELL: This emit is a side effect and
							// would appear spurious; all it does is
							// confirm to the player that they are
							// online.
							connection.emit('join', knownPlayer.index);
						}
					}
				}
			}

			if (!player) {
				console.log(`player ${playerKey} not found`);
				return;
			}

			this.connections.push(socket);

			let result = { playerKey: player.key };
			if (player) {
				if (this.isConnected(player)) {
					console.log(`WARNING: ${player.name} ${player.key} already connected`);
					result.timeout = this.nextTimeout;
				}
				else if (player.index == this.whosTurn)
					result.timeout = this.startTimeout(player);

				socket.player = player;

				console.log(`Player ${player.index} ${player.name} ${player.key} connected`);
				// Tell players that the player is connected
				this.notifyListeners('join', result);
			}

			const game = this;
			socket.on('disconnect', () => {
				game.connections = game.connections.filter(c => c != this);
				if (player)
					game.notifyListeners('leave', player.index);
			});
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
				reason = 'log-all-passed-twice';

			else if (this.letterBag.isEmpty() &&
					 this.players.find(p => p.rack.isEmpty()))
				reason = 'log-game-over';
			else
				return;

			console.log(`Finishing because ${reason}`);

			// Tally scores
			let playerWithNoTiles;
			let pointsRemainingOnRacks = 0;
			this.players.forEach(player => {
				let tilesLeft = [];
				let rackScore = 0;
				player.rack.squares.forEach(square => {
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
						throw Error("Found more than one player with no tiles when finishing game");
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

			return null;
		}

		/**
		 * Handler for 'cheat' command
		 * Calculate a play for the given player
		 */
		cheat(player) {
			console.log(`Player ${player.name} is cheating`);

			let bestPlay = null;
			findBestPlay(this, player.rack.tiles(), data => {
				if (typeof data === "string")
					console.log(data);
				else
					bestPlay = data;
			})
			.then(() => {
				let play;
				let msg = {
					name: 'Dictionary'
				};
				if (!bestPlay)
					msg.text = 'msg-no-play';
				else {
					console.log(bestPlay);
					const start = bestPlay.placements[0];
					msg.text = 'msg-hint';
					const words = bestPlay.words.map(w => w.word).join(',');
					msg.args = [ words, start.row + 1, start.col + 1 ];
				}
				// Tell *everyone* who the cheat is >:-)
				this.notifyListeners('message', msg);
			})
			.catch(e => {
				console.log('Error', e);
				this.notifyListeners(
					'message', {
						name: 'Dictionary',
						text: e.toString() });
			});
		}

		/**
		 * Handler for 'makeMove' command.
		 * @param player the Player making the move
		 * @param placementList array of Placement
		 * @return a Promise resolving to a Turn
		 */
		makeMove(player, move) {
			this.stopTimeout();

			console.log(`makeMove player ${player.index} `, move.toString());
			console.log(`Player's rack is ${player.rack}`);

			let game = this;

			// Move tiles from the rack to the board
			move.placements.forEach(placement => {
				const tile = player.rack.removeTile(placement);
				game.board.squares[placement.col][placement.row]
				.placeTile(tile, true);
			});

			player.score += move.score;

			// get new tiles to replace those placed
			let newTiles = [];
			for (let i = 0; i < move.placements.length; i++) {
				let tile = this.letterBag.getRandomTile();
				if (tile) {
					player.rack.addTile(tile);
					newTiles.push(tile);
				}
			}

			console.log("New rack", player.rack.toString());

			console.log("words ", move.words);
			this.getDictionary()
			.then(dict => {
				for (let w of move.words) {
					console.log("Checking ",w);
					if (!dict.hasWord(w.word))
						this.notifyListeners(
							'message', {
								name: this.dictionary,
								text: 'msg-word-not-found',
								args: w.word
							});
				}
			})
			.catch((e) => {
				console.log("Dictionary load failed", e);
			});

			game.previousMove = {
				placements: move.placements,
				newTiles: newTiles,
				score: move.score,
				player: player,
				words: move.words.map(w => w.word)
			};
			player.passes = 0;

			this.whosTurn = (this.whosTurn + 1) % this.players.length;
			const turn = new Turn(this, 'move', player, move.score);
			turn.move = move;
			turn.newTiles = newTiles;

			this.checkGameState();

			return Promise.resolve(turn);
		}

		/**
		 * Handler for 'takeBack' command.
		 * Undo the last move
		 * @param player the current player (NOT the player who's move is
		 * being undone)
		 * @param type the type of the takeBack; 'took-back' or 'challenge-won'
		 * @return a Promise resolving to a Turn
		 */
		takeBack(player, type) {
			if (!this.previousMove)
				throw Error('No previous move to take back');

			let previousMove = this.previousMove;
			delete this.previousMove;

			// Move tiles that were added to the rack as a consequence
			// of the previous move, back to the letter bag
			for (let newTile of previousMove.newTiles) {
				const tile = previousMove.player.rack.removeTile(newTile);
				this.letterBag.returnTile(tile);
			}

			// Move placed tiles from the board back to the rack
			for (let placement of previousMove.placements) {
				const boardSquare =
					this.board.squares[placement.col][placement.row];
				this.rack.addTile(boardSquare.tile);
				boardSquare.placeTile(null);
			}
			previousMove.player.score -= previousMove.score;

			if (type === 'took-back')
				this.whosTurn = previousMove.player.index;
			// else a successful challenge, does not move the player on

			const turn = new Turn(this,
				type, previousMove.player, -previousMove.score);
			turn.move = previousMove;
			turn.newTiles = previousMove.newTiles;
			turn.challenger = player.index;

			return Promise.resolve(turn);
		}

		/**
		 * Handler for 'pass' command.
		 * Player wants to (or has to) miss their move. Either they
		 * can't play, or challenged and failed.
		 * @param player player who is passing
		 * @param type pass type, 'pass' or 'challenge-failed'
		 * @return a Promise resolving to a Turn
		 */
		pass(player, type) {
			this.stopTimeout();

			delete this.previousMove;
			player.passes++;

			this.checkGameState();

			this.whosTurn = (this.whosTurn + 1) % this.players.length;

			return Promise.resolve(new Turn(this, type, player, 0));
		}

		/**
		 * Handler for 'challenge' command.
		 * Check the words created by the previous move are in the dictionary
		 * @param player the player doing the challenging
		 * @return Promise resolving to a Turn
		 */
		challenge(player) {
			return this.getDictionary()
			.then(dict => {
				const bad = this.previousMove.words
					  .filter(word => !dict.hasWord(word));

				if (bad.length > 0) {
					// Challenge succeeded
					console.log(`Bad Words: ${bad.join(',')}`);
					return this.takeBack(player, 'challenge-won');
				}

				// challenge failed, this player loses their turn
				return this.pass(player, 'challenge-failed');
			})
			.catch(() => {
				console.log("No dictionary, so challenge always succeeds");
				return this.takeBack(player, 'challenge-won');
			});
		}

		/**
		 * Handler for swap command.
		 * Player wants to swap their current rack for a different
		 * letters.
		 * @param player the Player doing the swap
		 * @param tiles list of Tile to swap
		 * @return Promise resolving to a Turn
		 */
		swap(player, tiles) {
			if (this.letterBag.remainingTileCount() < tiles.length)
				// Terminal, no point in translating
				throw Error(`Cannot swap, bag only has ${this.letterBag.remainingTileCount()} tiles`);

			delete this.previousMove;
			player.passes++;

			for (const tile of tiles) {
				const removed = player.rack.removeTile(tile);
				if (!removed)
					// Terminal, no point in translating
					throw Error(`Cannot swap, player rack does not contain letter ${tile.letter}`);
				this.letterBag.returnTile(removed);
			}

			// The swap is legal.  First get new tiles, then return
			// the old ones to the letter bag
			let newTiles = [];

			for (let i = 0; i < tiles.length; i++) {
				let newTile = this.letterBag.getRandomTile();
				newTiles.push(newTile);
				for (const square of player.rack.squares) {
					if (!square.tile)
						square.placeTile(newTile);
				}
			}

			this.whosTurn = (this.whosTurn + 1) % this.players.length;
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
			// re-order players so last winner starts
			const newPlayers = this.players.slice().sort((a, b) => {
				return a.score > b.score ? 1 : a.score == b.score ? 0 : 1;
			}).map(p => new Player(p));
			return new Game(this.edition, newPlayers, this.dictionary)
			.load()
			.then(newGame => {
				console.log(`Created follow-on game ${newGame.key}`);
				newGame.time_limit = this.time_limit;
				this.ended.nextGameKey = newGame.key;
				newGame.saver = this.saver;
				newGame.save();
				this.save();
				this.notifyListeners('nextGame', newGame.key);
			});
		}

		createPlayerTableDOM(thisPlayer) {
			let $tab = $('<table></table>');
			this.players.forEach(
				p => $tab.append(p.createScoreDOM(thisPlayer)));
			return $tab;
		}
	}

	Game.classes = [ LetterBag, Square, Board, Tile, Rack,
					 Game, Player, Move, Turn ];

	return Game;
});

