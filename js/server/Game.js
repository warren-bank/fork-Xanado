const deps = [
	"events",
	"crypto",
	"icebox",
	"game/Board",
	"game/Bag",
	"game/LetterBag",
	"game/Dictionary",
	"server/Player"
];

define("server/Game", deps, (Events, Crypto, Icebox, Board, Bag, LetterBag, Dictionary, Player) => {

	class Game extends Events.EventEmitter {

		static setDatabase(db) {
			Game.database = db;
		}

		constructor(edition, players) {
			super();
			this.edition = edition;
			this.players = players;
			this.key = Crypto.randomBytes(8).toString('hex');
			this.creationTimestamp = (new Date()).toISOString();
			this.turns = [];
			this.whosTurn = 0;
			this.passes = 0;
			this.connections = [];
			this.board = new Board(edition);
			this.letterBag = new LetterBag(edition.bag);
			for (let i = 0; i < this.players.length; i++) {
				const player = this.players[i];
				player.index = i;
				player.joinGame(this);
			}
		}

		lastActivity() {
			if (this.turns.length && this.turns[this.turns.length - 1].timestamp) {
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
			for (let i in this.players) {
				if (this.players[i].key == playerKey) {
					return this.players[i];
				}
			}
			return null;
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

		// @return Turn
		makeMove(player, placementList) {
			console.log('makeMove', placementList);
			
			let game = this;

			// validate the move (i.e. does the user have the tiles placed, are the tiles free on the board
			let rackSquares = player.rack.squares.slice();          // need to clone
			let placements = placementList.map(function (placement) {
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
				let toSquare = game.board.squares[placement.x][placement.y];
				if (toSquare.tile)
					throw Error(`target tile (${placement.x},${placement.y}) is already occupied`);
				return [fromSquare, toSquare];
			});
			placements.forEach(function(squares) {
				let tile = squares[0].tile;
				squares[0].placeTile(null);
				squares[1].placeTile(tile);
			});
			let move = this.board.calculateMove();
			if (move.error) {
				// fixme should be generalized function -- wait, no rollback? :|
				placements.forEach(squares => {
					let tile = squares[1].tile;
					squares[1].placeTile(null);
					squares[0].placeTile(tile);
				});
				throw Error(move.error);
			}
			placements.forEach(function(squares) {
				squares[1].tileLocked = true;
			});

			// add score
			player.score += move.score;

			// get new tiles
			let newTiles = this.letterBag.getRandomTiles(placements.length);
			for (let i = 0; i < newTiles.length; i++) {
				placements[i][0].placeTile(newTiles[i]);
			}
			console.log("words ", move.words);
			
			game.previousMove = {
				placements: placements,
				newTiles: newTiles,
				score: move.score,
				player: player,
				words: move.words.map(w => w.word)
			};
			game.passes = 0;

			return {
				type: 'move',
				player: player.index,
				score: move.score,
				tiles: newTiles,
				move: move,
				placements: placementList
			};
		}

		// @return Turn
		undoPreviousMove(type, player) {
			if (!this.previousMove) {
				throw Error('cannot take back move - no previous move in game');
			}
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
				type: type,
				player: previousMove.player.index,
				score: -previousMove.score,
				
				challenger: player.index,
				whosTurn: (type == "challenge" ? this.whosTurn : previousMove.player.index),
				placements: previousMove.placements.map(function(placement) {
					return { x: placement[1].x,
							 y: placement[1].y }
				}),
				returnLetters: returnLetters
			};
		}
		
		// @return turn
		pass(type, player) {
			delete this.previousMove;
			this.passes++;

			return {
				type: type,
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
					return this.undoPreviousMove("challenge", player);
				}

				// challenge failed, this player loses their turn
				return this.pass('failedChallenge', player);
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

		// return Turn
		swapTiles(player, letters) {
			if (this.letterBag.remainingTileCount() < 7) {
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
			
			// The swap is legal.  First get new tiles, then return the old ones to the letter bag
			let newTiles = this.letterBag.getRandomTiles(letters.length);
			this.returnPlayerLetters(player, letters);
			
			let tmpNewTiles = newTiles.slice();
			for (const square of player.rack.squares) {
				if (!square.tile) {
					square.placeTile(tmpNewTiles.pop());
				}
			}

			return {
				type: 'swap',
				player: player.index,
				score: 0,
				
				tiles: newTiles,
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
		 * Prepare a result from one of the command handlers, adjusting and saving game state
		 */
		prepareResult(player, result) {
			result.timestamp = Date.now();

			// store turn log
			this.turns.push(result);

			// determine whether the game's end has been reached
			if (this.passes == (this.players.length * 2)) {
				this.finish('all players passed two times');
			} else if (player.rack.squares.every(square => !square.tile)) {
				this.finish('player ' + this.whosTurn + ' ended the game');
			} else if (result.type != "challenge") {
				// determine who's turn it is now, for anything except a successful challenge
				this.whosTurn = (this.whosTurn + 1) % this.players.length;
				result.whosTurn = this.whosTurn;
			}

			// store new game data
			this.save();

			// notify listeners
			result.remainingTileCounts = this.remainingTileCounts();
			this.notifyListeners('turn', result);

			// if the game has ended, send extra notification with final scores
			if (this.ended()) {
				const endMessage = Icebox.freeze(this.endMessage);
				this.connections.forEach(function (socket) {
					socket.emit('gameEnded', endMessage);
				});
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
			let oldGame = this;
			let playerCount = oldGame.players.length;
			let newPlayers = [];
			// re-order players so last winner starts
			for (let i = 0; i < playerCount; i++) {
				let oldPlayer = oldGame.players[(i + startPlayer.index) % playerCount];
				newPlayers.push(new Player(
					oldPlayer.name, oldPlayer.email, oldPlayer.key));
			}
			let newGame = new Game(oldGame.edition, newPlayers);
			oldGame.endMessage.nextGameKey = newGame.key;
			oldGame.save();
			await newGame.ready();
			newGame.save();
			oldGame.notifyListeners('nextGame', newGame.key);
		}

		finish(reason) {
			delete this.whosTurn;

			// Tally scores
			let playerWithNoTiles;
			let pointsRemainingOnRacks = 0;
			this.players.forEach(function(player) {
				let tilesLeft = false;
				let rackScore = 0;
				player.rack.squares.forEach(function (square) {
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
				players: this.players.map(function(player) {
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

			if (player) {
				if (player.isConnected)
					console.log(`WARNING: ${player.name} ${player.key} already connected`);

				player.isConnected = true;
				
				// SMELL: only used in newConnection
				socket.player = player;
				
				console.log(`Player ${player.index} ${player.name} ${player.key} connected`);
				// Tell players that the player is connected
				this.notifyListeners('join', player.index);
			}
			
			const game = this;
			socket.on('disconnect', () => {
				game.connections = game.connections.filter(c => c != this);
				if (player) {
					player.isConnected = false;
					game.notifyListeners('leave', player.index);
				}
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
	
