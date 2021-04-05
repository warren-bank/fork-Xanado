/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

define("game/Game", [ "icebox", "game/GenKey", "game/Board", "game/Bag", "game/LetterBag", "game/Edition", "game/Player", "dawg/Dictionary" ], (Icebox, GenKey, Board, Bag, LetterBag, Edition, Player, Dictionary) => {

	/**
	 * The Game object could be used server or browser side, but in the
	 * event is only used on the server, which is responsible for management
	 * of all the active games.
	 */
	class Game {

		// Store the db statically to avoid issues with serialisation
		static setDatabase(db) {
			Game.database = db;
		}

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
			this.passes = 0;
			this.time_limit = 0; // never time out
			this.nextTimeout = 0;
			this.connections = [];
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

		getDictionary() {
			if (this.dictionary)
				return Dictionary.load(this.dictionary);
			
			return Promise.reject();
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

		toString() {
			return `${this.key} game of ${this.players.length} players edition ${this.edition} dictionary ${this.dictionary}\n` + this.players;
		}
		
		save() {
			console.log(`Saving game ${this.key}`);
			Game.database.set(this.key, this);
			console.log(`Saved game ${this.key}`);
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
				return Promise.reject('msg-player-does-not-exist');
		}

		/**
		 * Check that the given player is in this game, and it's their turn.
		 * Returned promise is rejected if it isn't the players turn or
		 * the game is not playable
		 */
		checkTurn(player) {
			if (this.ended()) {
				console.log(
					`Game ${this.key} has ended: ${this.endMessage.reason}`);
				return Promise.reject('msg-game-has-ended');
			}

			// determine if it is this player's turn
			if (player !== this.players[this.whosTurn]) {
				console.log(`not ${player.name}'s turn`);
				return Promise.reject('msg-not-your-turn');
			}
			return Promise.resolve(this, player);
		}

		/**
		 * @param player the Player making the move
		 * @param placementList array of Placement
		 */
		makeMove(player, placementList) {
			this.stopTimeout();
			
			console.log(`makeMove player ${player.index} ${player.key}`,
						placementList);
			console.log(`Player's rack is ${player.rack}`);
			console.log("Placement ", placementList);
			
			let game = this;

			// validate the move (i.e. does the user have the tiles
			// placed, are the tiles free on the board?)
			let rackSquares = player.rack.squares.slice();
			let fromTos = placementList.map(placement => {
				let fromSquare = null;
				for (let i = 0; i < rackSquares.length; i++) {
					let square = rackSquares[i];
					if (square && square.tile &&
						(square.tile.letter == placement.letter
						 || (square.tile.isBlank && placement.isBlank))) {
						if (placement.isBlank)
							square.tile.letter = placement.letter;
						fromSquare = square;
						delete rackSquares[i];
						break;
					}
				}
				if (!fromSquare) {
					throw Error(`cannot find letter ${placement.letter} in rack of player ${player.name}`);
				}
				placement.score = fromSquare.tile.score;
				let toSquare = game.board.squares[placement.col][placement.row];
				if (toSquare.tile)
					throw Error(`target tile (${placement.col},${placement.row}) is already occupied`);
				return [fromSquare, toSquare];
			});
			fromTos.forEach(squares => {
				let tile = squares[0].tile;
				squares[0].placeTile(null);
				squares[1].placeTile(tile);
			});
			
			// TODO: This has already been done client-side. Do we really
			// need to do it again?
			let move = this.board.analyseMove();
			
			if (move.error) {
				// fixme should be generalized function -- wait, no rollback? :|
				fromTos.forEach(squares => {
					let tile = squares[1].tile;
					squares[1].placeTile(null);
					squares[0].placeTile(tile);
				});
				throw Error(move.error);
			}
			fromTos.forEach(squares => squares[1].tileLocked = true);

			// add score
			move.bonus = this.board.calculateBonus(fromTos.length);
			move.score += move.bonus;
			player.score += move.score;

			// get new tiles
			let newRack = this.letterBag.getRandomTiles(fromTos.length);
			for (let i = 0; i < newRack.length; i++) {
				fromTos[i][0].placeTile(newRack[i]);
			}
			console.log("words ", move.words);
			this.getDictionary()
			.then(dict => {
				for (let w of move.words) {
					console.log("Checking ",w);
					if (!dict.hasWord(w.word))
						this.notifyListeners(
							'message', {
								name: this.dictionary,
								text: `msg-word-not-found ${w.word}`
							});
				}
			})
			.catch((e) => {
				console.log("Dictionary load failed", e);
			});
			
			game.previousMove = {
				placements: fromTos,
				score: move.score,
				player: player,
				words: move.words.map(w => w.word)
			};
			game.passes = 0;

			return {
				type: 'move',
				player: player.index,
				score: move.score,
				move: move,
				placements: placementList,

				newRack: newRack
			};
		}

		/**
		 * Undo the last move
		 * @param player the current player (NOT the player who's move is
		 * being undone)
		 * @param reason for the undo, "challenge" or "takeBack"
		 */
		undoPreviousMove(player, reason) {
			if (!this.previousMove)
				throw Error('cannot take back move - no previous move in game');

			let previousMove = this.previousMove;
			delete this.previousMove;

			let returnLetters = [];
			for (const placement of previousMove.placements) {
				let rackSquare = placement[0];
				let boardSquare = placement[1];
				if (rackSquare.tile) {
					returnLetters.push(rackSquare.tile.letter);
					this.letterBag.returnTile(rackSquare.tile);
					rackSquare.placeTile(null);
				}
				rackSquare.placeTile(boardSquare.tile);
				boardSquare.placeTile(null);
			}
			previousMove.player.score -= previousMove.score;

			return Promise.resolve({
				type: reason,
				player: previousMove.player.index,
				score: -previousMove.score,
				
				challenger: player.index,
				whosTurn: (reason == "challenge"
						   ? this.whosTurn : previousMove.player.index),
				placements: previousMove.placements.map(placement => {
					return { col: placement[1].col,
							 row: placement[1].row }
				}),
				returnLetters: returnLetters
			});
		}
		
		/**
		 * Player wants to (or has to) miss their move. Either they
		 * can't play, or challenged and failed.
		 * @param player player who is passing
		 * @param reason pass reason = 'pass' or 'failedChallenge'
		 */
		pass(player, reason) {
			this.stopTimeout();
			
			delete this.previousMove;
			this.passes++;

			return Promise.resolve({
				type: reason,
				player: player.index,
				score: 0
			});
		}

		/**
		 * Check the words created by the previous move are in the dictionary
		 * @return Promise
		 */
		challengePreviousMove(player) {
			return this.getDictionary()
			.then(dict => {
				const bad = this.previousMove.words
					  .filter(word => !dict.hasWord(word));
			
				if (bad.length > 0) {
					// Challenge succeeded
					console.log(`Bad Words: ${bad.join(',')}`);
					return this.undoPreviousMove(player, "challenge");
				}

				// challenge failed, this player loses their turn
				return this.pass(player, 'failedChallenge');
			})
			.catch(() => {
				console.log("No dictionary, so challenge always succeeds");
				return this.undoPreviousMove(player, "challenge");
			});
		}

		returnPlayerLetters(player, letters) {
			// return letter squares from the player's rack to the bag
			let lettersToReturn = new Bag(letters);
			this.letterBag.returnTiles(
				player.rack.squares.reduce(
				(accu, square) => {
					if (square.tile && lettersToReturn.contains(square.tile.letter)) {
						lettersToReturn.remove(square.tile.letter);
						accu.push(square.tile);
						square.placeTile(null);
					}
					return accu;
				},
					[]));
			if (lettersToReturn.contents.length) {
				throw Error(`could not find letters ${lettersToReturn.contents} to return on player ${player}'s rack`);
			}
		}

		/**
		 * Player wants to swap their current rack for a different
		 * letters.
		 */
		swapTiles(player, letters) {
			if (this.letterBag.remainingTileCount() < this.board.rackCount) {
				throw Error(`cannot swap, bag only has ${this.letterBag.remainingTileCount()} tiles`);
			}
			delete this.previousMove;
			this.passes++;
			let rackLetters = new Bag(player.rack.letters());
			for (const letter of letters) {
				if (rackLetters.contains(letter)) {
					rackLetters.remove(letter);
				} else {
					throw Error(`cannot swap, rack does not contain letter ${letter}`);
				}
			}
			
			// The swap is legal.  First get new tiles, then return
			// the old ones to the letter bag
			let newRack = this.letterBag.getRandomTiles(letters.length);
			this.returnPlayerLetters(player, letters);
			
			let tmpNewTiles = newRack.slice();
			for (const square of player.rack.squares) {
				if (!square.tile) {
					square.placeTile(tmpNewTiles.pop());
				}
			}

			return {
				type: 'swap',
				player: player.index,
				score: 0,
				
				newRack: newRack,
				count: letters.length,
			};
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
			delete turn.newRack; // no point logging this
			this.turns.push(turn);

			// determine whether the game's end has been reached
			if (this.passes == (this.players.length * 2)) {
				this.finish('all players passed twice');
			} else if (player.rack.squares.every(square => !square.tile)) {
				this.finish(`${this.players[this.whosTurn].name} ended the game`);
			} else if (turn.type != "challenge") {
				// determine who's turn it is now, for anything except
				// a successful challenge
				this.whosTurn = (this.whosTurn + 1) % this.players.length;
				turn.whosTurn = this.whosTurn;

				let p = this.players[this.whosTurn];
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

			// store new game data
			this.save();

			// notify listeners
			turn.remainingTileCounts = this.remainingTileCounts();
			//console.log("Notify turn", turn);
			this.notifyListeners('turn', turn);

			// if the game has ended, send extra notification with final scores
			if (this.ended()) {
				// Unclear why we have to freeze here, but not when
				// sending the turn. If we don't, we get an infinite
				// recursion in socket.io, in isBinary
				let serial = Icebox.freeze(this.endMessage);
				this.notifyListeners('gameEnded', serial);
			}
		}

		sendInvitations(config) {
			this.players.forEach(
				player => {
					if (!player.email)
						return;
					player.sendInvitation(
						`You have been invited to play Scrabble with ${this.joinProse(player)}`,
						config);
				});
		}

		// @return Promise
		createAnotherGame(startPlayer) {
			if (this.nextGameKey) {
				throw Error(`another game already created: old ${this.key} new ${this.nextGameKey}`);
			}
			console.log("Create follow-on game");
			let playerCount = this.players.length;
			let newPlayers = [];
			// re-order players so last winner starts
			for (let i = 0; i < playerCount; i++) {
				let oldPlayer = this.players[(i + startPlayer.index) % playerCount];
				newPlayers.push(new Player(oldPlayer));
			}
			return new Game(this.edition, newPlayers, this.dictionary)
			.load()
			.then(newGame => {
				newGame.time_limit = this.time_limit;
				this.endMessage.nextGameKey = newGame.key;
				newGame.save();
				this.save();
				this.notifyListeners('nextGame', newGame.key);
			});
		}

		finish(reason) {
			console.log(`Finishing because ${reason}`);
			
			// Tally scores
			let playerWithNoTiles;
			let pointsRemainingOnRacks = 0;
			this.players.forEach(player => {
				let tilesLeft = false;
				let rackScore = 0;
				player.rack.squares.forEach(square => {
					if (square.tile) {
						rackScore += square.tile.score;
						tilesLeft = true;
					}
				});
				if (tilesLeft) {
					player.score -= rackScore;
					player.tallyScore = -rackScore;
					pointsRemainingOnRacks += rackScore;
				} else {
					if (playerWithNoTiles) {
						throw Error("unexpectedly found more than one player with no tiles when finishing game");
					}
					playerWithNoTiles = player;
				}
			});

			if (playerWithNoTiles) {
				playerWithNoTiles.score += pointsRemainingOnRacks;
				playerWithNoTiles.tallyScore = pointsRemainingOnRacks;
			}

			let endMessage = {
				reason: reason,
				players: this.players.map(player => {
					return { name: player.name,
							 score: player.score,
							 tallyScore: player.tallyScore,
							 rack: player.rack };
				})
			};
			this.endMessage = endMessage;
			
			Game.database.snapshot();
		}

		ended() {
			return this.endMessage;
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
		
		newConnection(socket, playerKey) {

			let player;
			for (let knownPlayer of this.players) {
				if (knownPlayer.key == playerKey) {
					// Player is known to the game. Is this a reconnection?
					player = knownPlayer;
				} else {
					for (let connection of this.connections) {
						if (connection.player == knownPlayer) {
							// knownPlayer is already connected.
							// TODO: This emit is a side effect and would appear
							// spurious; all it does is confirm to the player
							// that they are online.
							connection.emit('join', knownPlayer.index);
						}
					}
				}
			}

			// What does 'join' *without* a playerKey do? At the moment nothing.
			// TODO: assign a playerKey to the connection
			if (playerKey && !player) {
				console.log(`player ${playerKey} not found`);
				return;
			}

			this.connections.push(socket);

			let result = { playerNumber: player.index };
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
		 * Generate a game reference string addressed to the given player
		 */
		joinProse(player) {
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
	}

	Game.database = null;

	return Game;
});
	
