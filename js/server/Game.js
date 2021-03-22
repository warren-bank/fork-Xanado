const deps = [
	"events",
	"crypto",
	"icebox",
	"game/Board",
	"game/Bag",
	"game/LetterBag",
	"game/Edition",
	"game/Dictionary",
	"server/Player"
];

define("server/Game", deps, (Events, Crypto, Icebox, Board, Bag, LetterBag, Edition, Dictionary, Player) => {

	class Game extends Events.EventEmitter {

		static setDatabase(db) {
			Game.database = db;
		}

		/**
		 * @param edition Edition object
		 * @param players list of Player
		 */
		constructor(edition, players) {
			super();
			this.edition = edition.name;
			this.players = players;
			this.key = Crypto.randomBytes(8).toString('hex');
			this.creationTimestamp = (new Date()).toISOString();
			this.turns = [];
			this.whosTurn = 0;
			this.passes = 0;
			this.time_limit = 0; // never time out
			this.nextTimeout = 0;
			this.connections = [];
			this.board = new Board(edition);
			this.letterBag = new LetterBag(edition);
			for (let i = 0; i < this.players.length; i++)
				this.players[i].joinGame(this, i);
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
				game.updateGameState(player, game.pass(player, 'timeout'));
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
			return `${this.key} ${this.players.length} ${this.edition}`;
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
			return this.players.find(p => (p.key == playerKey));
		}

		/**
		 * Check that the given player is in this game, and it's their turn.
		 * @throw if the player (or the game) is not playable
		 */
		checkTurn(player) {
			if (this.ended())
				throw Error(`Game ${this.key} has ended: ${this.endMessage.reason}`);

			// determine if it is this player's turn
			if (player !== this.players[this.whosTurn])
				throw Error(`not ${player.name}'s turn`);
		}

		/**
		 * @param player the Player making the move
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
			let placements = placementList.map(placement => {
				let fromSquare = null;
				for (let i = 0; i < rackSquares.length; i++) {
					let square = rackSquares[i];
					if (square && square.tile &&
						(square.tile.letter == placement.letter
						 || (square.tile.isBlank() && placement.blank))) {
						if (placement.blank) {
							square.tile.letter = placement.letter;
						}
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
			placements.forEach(squares => {
				let tile = squares[0].tile;
				squares[0].placeTile(null);
				squares[1].placeTile(tile);
			});
			let move = this.board.analyseMove();
			
			if (move.error) {
				// fixme should be generalized function -- wait, no rollback? :|
				placements.forEach(squares => {
					let tile = squares[1].tile;
					squares[1].placeTile(null);
					squares[0].placeTile(tile);
				});
				throw Error(move.error);
			}
			placements.forEach(squares => squares[1].tileLocked = true);

			// add score
			move.bonus = this.board.calculateBonus(placements.length);
			move.score += move.bonus;
			player.score += move.score;

			// get new tiles
			let newRack = this.letterBag.getRandomTiles(placements.length);
			for (let i = 0; i < newRack.length; i++) {
				placements[i][0].placeTile(newRack[i]);
			}
			console.log("words ", move.words);
			
			game.previousMove = {
				placements: placements,
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

			return {
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
			};
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

			return {
				type: reason,
				player: player.index,
				score: 0
			};
		}

		/**
		 * Check the words created by the previous move are in the dictionary
		 */
		async challengePreviousMove(player) {
			let promise;
			if (this.dictionary) {
				let game = this;
				promise = Dictionary.load(game.dictionary)
				.then(dict => {
					return game.previousMove.words
					.filter(word => !dict.hasWord(
						game.edition.getLetterIndices(word)));
				});
			} else
				promise = Promise.resolve([]);
			
			return promise.then(bad => {
				if (bad.length > 0) {
					// Challenge succeeded
					console.log(`Bad Words: ${bad.join(',')}`);
					return this.undoPreviousMove(player, "challenge");
				}

				// challenge failed, this player loses their turn
				return this.pass(player, 'failedChallenge');
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
		
		async createFollowonGame(startPlayer) {
			if (this.nextGameKey) {
				throw Error(`follow on game already created: old ${this.key} new ${this.nextGameKey}`);
			}
			console.log("Create follow-on game");
			let oldGame = this;
			let playerCount = oldGame.players.length;
			let newPlayers = [];
			// re-order players so last winner starts
			for (let i = 0; i < playerCount; i++) {
				let oldPlayer = this.players[(i + startPlayer.index) % playerCount];
				newPlayers.push(oldPlayer.copy());
			}
			Edition.load(this.edition)
			.then(edition => {
				let newGame = new Game(edition, newPlayers);
				newGame.dictionary = oldGame.dictionary;
				newGame.time_limit = oldGame.time_limit;
				oldGame.endMessage.nextGameKey = newGame.key;
				oldGame.save();
				newGame.save();
				oldGame.notifyListeners('nextGame', newGame.key);
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
	
