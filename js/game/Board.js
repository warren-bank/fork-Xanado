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
					const t = this.squares[col][row].tile;
					if (t) {
						// Show cast blanks using lower case letters
						// May not work in non-Latin languages.
						if (t.isBlank)
							r.push(t.letter.toLowerCase());
						else
							r.push(t.letter);
					} else
						r.push(' ');
				}
				s += r.join("|") + "\n";
			}
			return s;
		}

		/**
		 * Determine if the square is on the board and available for
		 * placing a tile
		 * @param col column of interest
		 * @param row row of interest
		 */
		isEmpty(col, row) {
			return (col >= 0 && row >= 0
					&& col < this.dim && row < this.dim
					&& !this.squares[col][row].tile);
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
						// Treat lower-case letters as cast blanks.
						// May not work in non-latin languages.
						this.squares[col][row].placeTile(
							new Tile(
								letter.toUpperCase(),
								letter.toUpperCase() != letter, 1), true);
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
		 * Given a play at col, row, compute its score. Note that the
		 * "all tiles played" bonus is NOT applied here.
		 * @param col, row the coordinates of the LAST letter
		 * @param dcol, drow 1/0 depending if the word is played across
		 * or down
		 * @param tiles a list of Tiles
		 * @param words optional list to be populated with words that
		 * have been created
		 * by the play
		 * @return the score of the play. Side effect is to update words.
		 */
		scorePlay(col, row, dcol, drow, tiles, words) {

			if (words)
				words.push(tiles.map(tile => tile.letter).join(""));
			
			// Accumulator for the primary word being formed by the tiles
			let wordScore = 0;
			
			// Accumulator for crossing words scores.
			let crossWordsScore = 0;

			// Multipler for the vertical word
			let wordMultiplier = 1;

			// Work back from the last letter
			for (let lIndex = 0; lIndex < tiles.length; lIndex++) {
				const r = row - lIndex * drow;
				const c = col - lIndex * dcol;
				const tile = tiles[tiles.length - lIndex - 1];
				if (r != tile.row)
					debugger;
				if (c != tile.col)
					debugger;
				let letterScore = tile.score;
				const square = this.squares[c][r];

				if (square.tileLocked) {
					wordScore += letterScore;
					continue; // pre-existing tile, no bonuses
				}

				// Letter is being placed, so letter multiplier applies to all
				// new words created, including cross words
				letterScore *= square.letterScoreMultiplier;

				wordScore += letterScore;
				
				// Multiplier for any new words that cross this letter
				let crossWordMultiplier = square.wordScoreMultiplier;
				wordMultiplier *= crossWordMultiplier;

				// This is a new tile, need to analyse cross words and
				// apply bonuses
				let crossWord = '';
				let crossWordScore = 0;
				
				// Look left/up
				for (let cp = c - drow, rp = r - dcol;
					 cp >= 0 && rp >= 0 && this.squares[cp][rp].tile;
					 cp -= drow, rp -= dcol) {
					const tile = this.squares[cp][rp].tile;
					crossWord += tile.letter;
					crossWordScore += tile.score;
				}

				crossWord += tile.letter;
				
				// Look right/down
				for (let cp = c + drow, rp = r + dcol;
					 cp < this.dim && rp < this.dim
					 && this.squares[cp][rp].tile;
					 cp += drow, rp += dcol) {
					const tile = this.squares[cp][rp].tile;
					crossWord += tile.letter;
					crossWordScore += tile.score
				}

				if (crossWordScore > 0) {
					// This tile (and bonuses) contribute to cross words
					if (words)
						words.push(crossWord);
					
					crossWordScore += letterScore;
					crossWordScore *= crossWordMultiplier;
					crossWordsScore += crossWordScore;
				}
			}
			
			wordScore *= wordMultiplier;
			
			// Add cross word values to the main word value
			wordScore += crossWordsScore;
			
			return wordScore;
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
					if (square.tile && !square.tileLocked)
						move.addPlacement(square.tile);
				}
			}
			
			return move;
		}
	}
	
	return Board;
});
