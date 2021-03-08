define("scrabble/Board", ["triggerEvent", "scrabble/Square"], (triggerEvent, Square) => {

	class Board {
		constructor(dim) {
			this.Dimension = dim;
			
			this.squares = new Array(this.Dimension);

			// column major
			for (let x = 0; x < this.Dimension; x++) {
				this.squares[x] = new Array(this.Dimension);
				for (let y = 0; y < this.Dimension; y++) {
					this.makeSquare(x, y);
				}
			}
			
			triggerEvent('BoardReady', [ this ]);
		}

		makeSquare(x, y) {
			let square;
			const top = this.Dimension - 1;
			const middle = Math.floor(this.Dimension / 2);
			const halfMiddle = Math.ceil(middle / 2);

			// TODO: do a better job on larger boards.
			if ((x == 0 || x == top || x == middle)
				&& (y == 0 || y == top || y == middle && x != middle)) {
				// Triple word scores thin on the ground
				square = new Square('TripleWord', this, x, y);
			} else if (
				x == middle && y == middle // centre square
					   
				|| x > 0 && x < middle - 2 && (y == x || y == top - x)
					   
				|| x > middle + 2 && x < top
				&& (x == y || x == top - y)) {
				// Diagonals
				square = new Square('DoubleWord', this, x, y);
				
			} else if (
				// ((x - middle + 2) % 4) == 0 && ((y - middle + 2) % 4) == 0) { // scalable - maybe!
				(x == middle - 2 || x == middle + 2)
				&& (y == middle - 2 || y == middle + 2)
					   
				|| (y == middle + 2 || y == middle - 2)
				&& (x == middle + halfMiddle + 2 || x == middle - halfMiddle - 2)
					   
				|| (x == middle + 2 || x == middle - 2)
				&& (y == middle + halfMiddle + 2 || y == middle - halfMiddle - 2)) {
				square = new Square('TripleLetter', this, x, y);
			} else if (
				(x == middle - 1 || x == middle + 1)
				&& (y == middle - 1 || y == middle + 1)
					   
				|| (x == 0 || x == top || x == middle)
				&& (y == middle + halfMiddle || y == middle - halfMiddle)
					   
				|| (y == 0 || y == top || y == middle)
				&& (x == middle + halfMiddle || x == middle - halfMiddle)
					   
				|| (y == middle + 1 || y == middle - 1)
				&& (x == middle + halfMiddle + 1 || x == middle - halfMiddle - 1)
					   
				|| (x == middle + 1 || x == middle - 1)
				&& (y == middle + halfMiddle + 1 || y == middle - halfMiddle - 1)) {
				square = new Square('DoubleLetter', this, x, y);
			} else {
				square = new Square('Normal', this, x, y);
			}

			this.squares[x][y] = square;
		}
		
		forAllSquares(f) {
			for (let x = 0; x < this.Dimension; x++) {
				const row = this.squares[x];
				for (let y = 0; y < this.Dimension; y++)
					f(row[y]);
			}
		}

		emptyTiles() {
			this.forAllSquares(function (square) {
				square.placeTile(null);
			});
		}

		toString() {
			return "Board " + this.Dimension + " x " + this.Dimension;
		}

		touchingOld(x, y) {
			return (
				(x > 0 && this.squares[x - 1][y].tile && this.squares[x - 1][y].tileLocked)
				|| (x < this.Dimension - 1 && this.squares[x + 1][y].tile
					&& this.squares[x + 1][y].tileLocked)
				|| (y > 0 && this.squares[x][y - 1].tile
					&& this.squares[x][y - 1].tileLocked)
				|| (y < this.Dimension - 1 && this.squares[x][y + 1].tile
					&& this.squares[x][y + 1].tileLocked));
		}

		// Caclulate wordscore assuming word is horizontal
		horizontalWordScores(move, squares) {
			let score = 0;
			for (let y = 0; y < this.Dimension; y++) {
				for (let x = 0; x < this.Dimension - 1; x++) {
					if (squares[x][y].tile && squares[x + 1][y].tile) {
						let wordScore = 0;
						let letters = '';
						let wordMultiplier = 1;
						let isNewWord = false;
						for (; x < this.Dimension && squares[x][y].tile; x++) {
							let square = squares[x][y];
							let letterScore = square.tile.score;
							isNewWord = isNewWord || !square.tileLocked;
							if (!square.tileLocked) {
								switch (square.type) {
								case 'DoubleLetter':
									letterScore *= 2;
									break;
								case 'TripleLetter':
									letterScore *= 3;
									break;
								case 'DoubleWord':
									wordMultiplier *= 2;
									break;
								case 'TripleWord':
									wordMultiplier *= 3;
									break;
								}
							}
							wordScore += letterScore;
							letters += square.tile.letter;
						}
						wordScore *= wordMultiplier;
						if (isNewWord) {
							move.words.push({ word: letters, score: wordScore });
							score += wordScore;
						}
					}
				}
			}
			return score;
		}

		calculateMove() {
			const squares = this.squares;
			// Check that the start field is occupied
			const middle = Math.floor(this.Dimension / 2);
			if (!squares[middle][middle].tile) {
				return { error: "start field must be used" };
			}
			
			// Determine that the placement of the Tile(s) is legal
			
			// Find top-leftmost placed tile
			let x, y;
			let topLeftX, topLeftY;
			let tile;
			for (y = 0; !tile && y < this.Dimension; y++) {
				for (x = 0; !tile && x < this.Dimension; x++) {
					if (squares[x][y].tile && !squares[x][y].tileLocked) {
						tile = squares[x][y].tile;
						topLeftX = x;
						topLeftY = y;
					}
				}
			}
			if (!tile) {
				return { error: "no new tile found" };
			}
			
			// Remember which newly placed tile positions are legal
			const legalPlacements = new Array(this.Dimension);
			for (let x = 0; x < this.Dimension; x++) {
				legalPlacements[x] = new Array(this.Dimension);
			}
			legalPlacements[topLeftX][topLeftY] = true;
			
			let isTouchingOld = this.touchingOld(topLeftX, topLeftY);
			let horizontal = false;
			for (let x = topLeftX + 1; x < this.Dimension; x++) {
				if (!squares[x][topLeftY].tile) {
					break;
				} else if (!squares[x][topLeftY].tileLocked) {
					legalPlacements[x][topLeftY] = true;
					horizontal = true;
					isTouchingOld = isTouchingOld || this.touchingOld(x, topLeftY);
				}
			}

			if (!horizontal) {
				for (let y = topLeftY + 1; y < this.Dimension; y++) {
					if (!squares[topLeftX][y].tile) {
						break;
					} else if (!squares[topLeftX][y].tileLocked) {
						legalPlacements[topLeftX][y] = true;
						isTouchingOld = isTouchingOld || this.touchingOld(topLeftX, y);
					}
				}
			}

			if (!isTouchingOld && !legalPlacements[middle][middle]) {
				return { error: 'not touching old tile ' + topLeftX + '/' + topLeftY };
			}

			// Check whether there are any unconnected other placements, count total tiles on board
			let totalTiles = 0;
			for (let x = 0; x < this.Dimension; x++) {
				for (let y = 0; y < this.Dimension; y++) {
					let square = squares[x][y];
					if (square.tile) {
						totalTiles++;
						if (!square.tileLocked && !legalPlacements[x][y]) {
							return { error: 'unconnected placement' };
						}
					}
				}
			}
			
			if (totalTiles == 1) {
				return { error: 'first word must consist of at least two letters' };
			}

			let move = { words: [] };

			move.score = this.horizontalWordScores(move, squares);
			// Create rotated version of the board to calculate vertical word scores.
			const rotatedSquares = new Array(this.Dimension);
			for (let x = 0; x < this.Dimension; x++) {
				rotatedSquares[x] = new Array(this.Dimension);
				for (let y = 0; y < this.Dimension; y++) {
					rotatedSquares[x][y] = squares[y][x];
				}
			}
			move.score += this.horizontalWordScores(move, rotatedSquares);

			// Collect and count tiles placed.
			let tilesPlaced = [];
			for (let x = 0; x < this.Dimension; x++) {
				for (let y = 0; y < this.Dimension; y++) {
					let square = squares[x][y];
					if (square.tile && !square.tileLocked) {
						tilesPlaced.push({ letter: square.tile.letter,
										   x: x,
										   y: y,
										   blank: square.tile.isBlank() });
					}
				}
			}
			if (tilesPlaced.length == 7) {
				move.score += 50;
				move.allTilesBonus = true;
			}
			move.tilesPlaced = tilesPlaced;

			return move;
		}
	}

	return Board;
});
