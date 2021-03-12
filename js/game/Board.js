define("game/Board", ["triggerEvent", "game/Square"], (triggerEvent, Square) => {

	class Board {
		
		constructor(edition) {
			this.allPlacedBonus = edition.allPlacedBonus;
			this.dim = edition.dim;
			this.middle = Math.floor(this.dim / 2);
			
			this.squares = new Array(this.dim);

			for (let col = 0; col < this.dim; col++) {
				this.squares[col] = new Array(this.dim);
				const coli = Math.abs(col - this.middle);

				for (let row = 0; row < this.dim; row++) {
					const rowi = Math.abs(row - this.middle);
					let type = edition.layout[coli].charAt(rowi);
					this.squares[col][row] = new Square(type, this, col, row);
				}
			}

			triggerEvent('BoardReady', [ this ]);
		}

		/**
		 * Apply f() to each square
		 */
		forAllSquares(f) {
			for (let col = 0; col < this.dim; col++) {
				const column = this.squares[col];
				for (let row = 0; row < this.dim; row++)
					f(column[row]);
			}
		}

		/**
		 * Remove all tiles
		 */
		emptyTiles() {
			this.forAllSquares(function (square) {
				square.placeTile(null);
			});
		}

		/**
		 * Debug
		 */
		toString() {
			let s = `Board ${this.dim}x${this.dim}`;
			for (let row = 0; row < this.dim; row++) {
				s += "\n";
				for (let col = 0; col < this.dim; col++) {
					s += this.squares[col][row].type;
				}
			}
			return s;
		}

		/**
		 * True if one of the neighbours of [col, row] is already occupied by
		 * a tile
		 */
		touchingOld(col, row) {
			return (
				(col > 0 && this.squares[col - 1][row].tile && this.squares[col - 1][row].tileLocked)
				|| (col < this.dim - 1 && this.squares[col + 1][row].tile
					&& this.squares[col + 1][row].tileLocked)
				|| (row > 0 && this.squares[col][row - 1].tile
					&& this.squares[col][row - 1].tileLocked)
				|| (row < this.dim - 1 && this.squares[col][row + 1].tile
					&& this.squares[col][row + 1].tileLocked));
		}

		// @private
		// Calculate word score assuming word is horizontal, and
		// update the move score and list of words accordingly
		// @param move the {score:N words:[]} move to update
		// @param squares the set of squares to operate on
		horizontalWordScores(move, squares) {
			let score = 0;
			for (let row = 0; row < this.dim; row++) {
				for (let col = 0; col < this.dim - 1; col++) {
					if (squares[col][row].tile && squares[col + 1][row].tile) {
						let wordScore = 0;
						let letters = '';
						let wordMultiplier = 1;
						let isNewWord = false;
						for (; col < this.dim && squares[col][row].tile; col++) {
							let square = squares[col][row];
							let letterScore = square.tile.score;
							isNewWord = isNewWord || !square.tileLocked;
							if (!square.tileLocked) {
								letterScore *= square.letterScoreMultiplier;
								wordMultiplier *= square.wordScoreMultiplier;
							}
							wordScore += letterScore;
							letters += square.tile.letter;
						}
						wordScore *= wordMultiplier;
						if (isNewWord) {
							move.words.push(
								{ word: letters, score: wordScore });
							score += wordScore;
						}
					}
				}
			}
			move.score += score;
		}

		calculateMove() {
			const squares = this.squares;
			// Check that the start field is occupied

			if (!squares[this.middle][this.middle].tile) {
				return { error: "start field must be used" };
			}
			
			// Determine that the placement of the Tile(s) is legal
			
			// Find top-leftmost placed tile
			let col, row;
			let topLeftX, topLeftY;
			let tile;
			for (row = 0; !tile && row < this.dim; row++) {
				for (col = 0; !tile && col < this.dim; col++) {
					if (squares[col][row].tile && !squares[col][row].tileLocked) {
						tile = squares[col][row].tile;
						topLeftX = col;
						topLeftY = row;
					}
				}
			}
			if (!tile) {
				return { error: "no new tile found" };
			}
			
			// Remember which newly placed tile positions are legal
			const legalPlacements = new Array(this.dim);
			for (let col = 0; col < this.dim; col++) {
				legalPlacements[col] = new Array(this.dim);
			}
			legalPlacements[topLeftX][topLeftY] = true;
			
			let isTouchingOld = this.touchingOld(topLeftX, topLeftY);
			let horizontal = false;
			for (let col = topLeftX + 1; col < this.dim; col++) {
				if (!squares[col][topLeftY].tile) {
					break;
				} else if (!squares[col][topLeftY].tileLocked) {
					legalPlacements[col][topLeftY] = true;
					horizontal = true;
					isTouchingOld = isTouchingOld || this.touchingOld(col, topLeftY);
				}
			}

			if (!horizontal) {
				for (let row = topLeftY + 1; row < this.dim; row++) {
					if (!squares[topLeftX][row].tile) {
						break;
					} else if (!squares[topLeftX][row].tileLocked) {
						legalPlacements[topLeftX][row] = true;
						isTouchingOld = isTouchingOld || this.touchingOld(topLeftX, row);
					}
				}
			}

			if (!isTouchingOld && !legalPlacements[this.middle][this.middle]) {
				return { error: 'not touching old tile ' + topLeftX + '/' + topLeftY };
			}

			// Check whether there are any unconnected other placements, count total tiles on board
			let totalTiles = 0;
			for (let col = 0; col < this.dim; col++) {
				for (let row = 0; row < this.dim; row++) {
					let square = squares[col][row];
					if (square.tile) {
						totalTiles++;
						if (!square.tileLocked && !legalPlacements[col][row]) {
							return { error: 'unconnected placement' };
						}
					}
				}
			}
			
			if (totalTiles == 1) {
				return { error: 'first word must consist of at least two letters' };
			}

			let move = { words: [], score: 0 };

			this.horizontalWordScores(move, squares);
			// Create rotated version of the board to calculate vertical word scores.
			const rotatedSquares = new Array(this.dim);
			for (let col = 0; col < this.dim; col++) {
				rotatedSquares[col] = new Array(this.dim);
				for (let row = 0; row < this.dim; row++) {
					rotatedSquares[col][row] = squares[row][col];
				}
			}
			this.horizontalWordScores(move, rotatedSquares);

			// Collect and count tiles placed.
			let tilesPlaced = [];
			for (let col = 0; col < this.dim; col++) {
				for (let row = 0; row < this.dim; row++) {
					let square = squares[col][row];
					if (square.tile && !square.tileLocked) {
						tilesPlaced.push({ letter: square.tile.letter,
										   x: col,
										   y: row,
										   blank: square.tile.isBlank() });
					}
				}
			}
			if (tilesPlaced.length == 7) {
				move.score += this.allPlacedBonus;
				move.allTilesBonus = true;
			}
			move.tilesPlaced = tilesPlaced;

			return move;
		}
	}
	
	/*	CheckDictionary() {
		var word = "";
		var wordSquares = [];
		
		var validHorizontalWords = [];
		var validVerticalWords = [];

		var invalidSquares = [];

		var square = this.Squares[this.middle][this.middle];
		if (square.Tile == 0) {
			triggerEvent("ScrabbleBoardSquareStateChanged", { 'Board': this, 'Square': square, 'State': 1 });
	
			invalidSquares.push(square);
		}

		for (var row = 0; row < this.dim; row++) {
			for (var col = 0; col < this.dim; col++) {
				var square = this.Squares[col][row];
				if (square.Tile != 0) {
					wordSquares.push(square);
					word += square.Tile.Letter;
				} else {
					if (word.length <= 1 || !this.Game.Dictionary.CheckWord(word)) {
						for (var i = 0; i < wordSquares.length; i++) {
							var square = wordSquares[i];
							var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
							var td = document.getElementById(id).parentNode;
						
							//$(td).addClass("Invalid");
							triggerEvent("ScrabbleBoardSquareStateChanged", { 'Board': this, 'Square': square, 'State': 1 });
							
							invalidSquares.push(square);
						}
					} else {
						var newArray = wordSquares.slice();
						validHorizontalWords.push(newArray);
					}
				
					word = "";
					wordSquares = [];
				}
			}
		}
	
		for (var col = 0; col < this.dim; col++) {
			for (var row = 0; row < this.dim; row++) {
				var square = this.Squares[col][row];
				if (square.Tile != 0) {
					wordSquares.push(square);
					word += square.Tile.Letter;
				} else {
					if (word.length <= 1 || !this.Game.Dictionary.CheckWord(word)) {
						for (var i = 0; i < wordSquares.length; i++) {
							var square = wordSquares[i];
							var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
							var td = document.getElementById(id).parentNode;
							
							$(td).addClass("Invalid");
							triggerEvent("ScrabbleBoardSquareStateChanged", { 'Board': this, 'Square': square, 'State': 1 });
							
							invalidSquares.push(square);
						}
					} else {
						var newArray = wordSquares.slice();
						validVerticalWords.push(newArray);
					}
					
					word = "";
					wordSquares = [];
				}
			}
		}

		for (var i = 0; i < validHorizontalWords.length; i++) {
			wordSquares = validHorizontalWords[i];
			for (var j = 0; j < wordSquares.length; j++) {
				var square = wordSquares[j];
				var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
				var td = document.getElementById(id).parentNode;
				//$(td).removeClass("Invalid");
				//$(td).addClass("Valid");
				triggerEvent("ScrabbleBoardSquareStateChanged", { 'Board': this, 'Square': square, 'State': 0 });
			
				for (var k = 0; k < invalidSquares.length; k++) {
					if (invalidSquares[k] == square) {
						invalidSquares.splice(k--, 1);
					}
				}
			}
		}
	
		for (var i = 0; i < validVerticalWords.length; i++) {
			wordSquares = validVerticalWords[i];
		
			for (var j = 0; j < wordSquares.length; j++) {
				var square = wordSquares[j];
				//TODO: check if there is a path to the center square
				//TODO: check played tiles (!Tile.Locked) are vertical XOR horizontal, and without gaps
				//triggerEvent("ScrabbleBoardSquareStateChanged", { 'Board': this, 'Square': square, 'State': 2 });
			}
		
			for (var j = 0; j < wordSquares.length; j++) {
				var square = wordSquares[j];
				var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
				var td = document.getElementById(id).parentNode;
				//$(td).removeClass("Invalid");
				//$(td).addClass("Valid");
				triggerEvent("ScrabbleBoardSquareStateChanged", { 'Board': this, 'Square': square, 'State': 0 });
			
				for (var k = 0; k < invalidSquares.length; k++) {
					if (invalidSquares[k] == square) {
						invalidSquares.splice(k--, 1);
					}
				}
			}
		}

		return invalidSquares.length == 0;
	}
*/
	return Board;
});
