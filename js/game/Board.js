/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

define("game/Board", ["game/Square", "game/Tile", "game/Move"], (Square, Tile, Move) => {

	class Board {

		/**
		 * @param edition the Edition defining the board layout
		 */
		constructor(edition) {
			// Copy essentials from the Edition, so we don't try
			// to serialise the Edition
			this.bonuses = edition.bonuses;
			this.rackCount = edition.rackCount;
			this.swapCount = edition.swapCount;
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
		}

		/**
		 * Remove all tiles
		 */
		empty() {
			for (let col = 0; col < this.dim; col++) {
				const column = this.squares[col];
				for (let row = 0; row < this.dim; row++) {
					column[row].placeTile(null);
				}
			}
		}

		/**
		 * Debug
		 */
		toString() {
			let s = `Board ${this.dim}x${this.dim}\n`;
			
			for (let row = 0; row < this.dim; row++) {
				let r = [];
				for (let col = 0; col < this.dim; col++) {
					if (this.squares[col][row].tile)
						r.push(this.squares[col][row].tile.letter);
					else
						r.push(' ');
				}
				s += r.join("|") + "\n";
			}
			return s;
		}

		/**
		 * Load the board from the string representation output by
		 * toString. This is for use in tests.
		 */
		parse(sboard) {
			const lines = sboard.split("\n");
			for (let row = 0; row < this.dim; row++) {
				let r = lines[row].split("|");
				r.shift();
				console.log(r.join("|"));
				let col = 0;
				for (col = 0; col < this.dim; col++) {
					let letter = r[col];
					if (letter != ' ') {
						this.squares[col][row].placeTile(
							new Tile(letter, 1), true);
					}
				}
			}
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
		// update the move accordingly
		// @param move the {score:N words:[]} move to update
		// @param squares the set of squares to operate on
		scoreNewWords(move, squares) {
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
						if (isNewWord)
							move.addWord(letters, wordScore * wordMultiplier);
					}
				}
			}
		}

		/**
		 * Calculate the bonus if tilesPlaced tiles are placed
		 * Really belongs in Edition, but here because Edition is
		 * not sent to the client.
		 */
		calculateBonus(tilesPlaced) {
			if (typeof this.bonuses[tilesPlaced] === "number")
				return this.bonuses[tilesPlaced];
			return 0;
		}
		
		/**
		 * UI-side move calculation. Note that the score calculated
		 * does NOT include any bonuses!
		 * @return a Move, or an error.
		 */
		analyseMove() {
			const squares = this.squares;
			// Check that the start field is occupied

			if (!squares[this.middle][this.middle].tile) {
				return { error: "centre must be used" };
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
				// Move can't be made. Should never happen?
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

			// Check whether there are any unconnected placements
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
			
			if (totalTiles == 1)
				return {
					error: 'first word must consist of at least two letters'
				};

			let move = new Move();

			// Calculate horizontal word scores
			this.scoreNewWords(move, squares);

			// Transpose the board to calculate vertical word scores.
			const transpose = new Array(this.dim);
			for (let col = 0; col < this.dim; col++) {
				transpose[col] = new Array(this.dim);
				for (let row = 0; row < this.dim; row++) {
					transpose[col][row] = squares[row][col];
				}
			}
			this.scoreNewWords(move, transpose);

			// Collect tiles placed.
			for (let col = 0; col < this.dim; col++) {
				for (let row = 0; row < this.dim; row++) {
					let square = squares[col][row];
					if (square.tile && !square.tileLocked) {
						move.addPlacement(
							square.tile.letter, col, row, square.tile.isBlank);
					}
				}
			}
			
			return move;
		}
	}
	
	return Board;
});
