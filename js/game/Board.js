/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node, jquery */

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
				s += `|${r.join("|")}|\n`;
			}
			return s;
		}

		/**
		 * Get the square at [col][row]
		 */
		at(col, row) {
			return this.squares[col][row];
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
		parse(sboard, edition) {
			const lines = sboard.split("\n");
			for (let row = 0; row < this.dim; row++) {
				let r = lines[row].split("|");
				r.shift();
				let col = 0;
				for (col = 0; col < this.dim; col++) {
					let letter = r[col];
					if (letter != ' ') {
						// Treat lower-case letters as cast blanks.
						// May not work in non-latin languages.
						const isBlank = letter.toUpperCase() != letter;
						const tile = new Tile(
							letter.toUpperCase(),
							isBlank,
							isBlank ? 0	: edition.letterScore(letter));
						this.squares[col][row].placeTile(tile, true);
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

		/**
		 * @private
		 * Calculate score for all horizontal words that involve new
		 * tiles.
		 * This is used on the UI side, when the placement may be fragmented
		 * and difficult to analyse.
		 * @param squares the set of squares to operate on
		 * @param words list {score:N word:""} to update
		 * @return the total score
		 */
		scoreHorizontalWords(squares, words) {
			let totalScore = 0;
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
						if (isNewWord) {
							wordScore *= wordMultiplier;
							totalScore += wordScore;
							words.push({
								word: letters,
								score: wordScore
							});
						}
					}
				}
			}
			return totalScore;
		}

		/**
		 * Given a play at col, row, compute its score.
		 * @param col, row the coordinates of the LAST letter
		 * @param dcol, drow 1/0 depending if the word is being played across
		 * or down
		 * @param tiles a list of Tiles
		 * @param words optional list to be populated with words that
		 * have been created
		 * by the play
		 * @return the score of the play. Side effect is to update words.
		 */
		scorePlay(col, row, dcol, drow, tiles, words) {

			// Accumulator for the primary word being formed by the tiles
			let wordScore = 0;

			// Accumulator for crossing words scores.
			let crossWordsScore = 0;

			// Multipler for the main word
			let wordMultiplier = 1;

			// Number of tiles being placed, for calculating bonus
			let tilesPlaced = 0;

			for (let tile of tiles) {
				const c = tile.col;
				const r = tile.row;

				let letterScore = tile.score;
				const square = this.squares[c][r];

				if (square.tileLocked) {
					wordScore += letterScore;
					continue; // pre-existing tile, no bonuses
				}

				// Letter is being placed, so letter multiplier applies to all
				// new words created, including cross words
				letterScore *= square.letterScoreMultiplier;

				tilesPlaced++;

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
					crossWord = tile.letter + crossWord;
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
					crossWordScore += letterScore;
					crossWordScore *= crossWordMultiplier;
					if (words)
						words.push({ word: crossWord, score: crossWordScore });

					crossWordsScore += crossWordScore;
				}
			}

			wordScore *= wordMultiplier;

			if (words)
				words.push({
					word: tiles.map(tile => tile.letter).join(""),
					score: wordScore
				});

			// Add cross word values to the main word value
			wordScore += crossWordsScore;

			return wordScore + this.calculateBonus(tilesPlaced);
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
		 * UI-side move calculation.
		 * @return a Move, or a string if there is a problem
		 */
		analyseMove() {
			const squares = this.squares;
			// Check that the start field is occupied

			if (!squares[this.middle][this.middle].tile)
				return 'warn-centre-must-be-used';

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
			if (!tile)
				// Move can't be made. Should never happen
				// Terminal, no point in translating
				throw Error('No new tile found');

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
					isTouchingOld =
					isTouchingOld || this.touchingOld(col, topLeftY);
				}
			}

			if (!horizontal) {
				for (let row = topLeftY + 1; row < this.dim; row++) {
					if (!squares[topLeftX][row].tile) {
						break;
					} else if (!squares[topLeftX][row].tileLocked) {
						legalPlacements[topLeftX][row] = true;
						isTouchingOld =
						isTouchingOld || this.touchingOld(topLeftX, row);
					}
				}
			}

			if (!isTouchingOld && !legalPlacements[this.middle][this.middle])
				return 'warn-disconnected';

			// Check whether there are any unconnected placements
			let totalTiles = 0;
			for (let col = 0; col < this.dim; col++) {
				for (let row = 0; row < this.dim; row++) {
					let square = squares[col][row];
					if (square.tile) {
						totalTiles++;
						if (!square.tileLocked && !legalPlacements[col][row])
							return 'warn-disconnected';
					}
				}
			}

			if (totalTiles == 1)
				return 'warn-at-least-two';

			let move = new Move();

			// Calculate horizontal word scores
			move.score = this.scoreHorizontalWords(squares, move.words);

			// Transpose the board to calculate vertical word scores.
			const transpose = new Array(this.dim);
			for (let col = 0; col < this.dim; col++) {
				transpose[col] = new Array(this.dim);
				for (let row = 0; row < this.dim; row++) {
					transpose[col][row] = squares[row][col];
				}
			}
			move.score += this.scoreHorizontalWords(transpose, move.words);

			// Collect tiles placed.
			let placed = 0;
			for (let col = 0; col < this.dim; col++) {
				for (let row = 0; row < this.dim; row++) {
					let square = squares[col][row];
					if (square.tile && !square.tileLocked) {
						move.addPlacement(square.tile);
						placed++;
					}
				}
			}

			move.bonus = this.calculateBonus(placed);
			move.score += move.bonus;

			return move;
		}

		/**
		 * Create the DOM representation
		 */
		createDOM() {
			let $table = $("<table></table>");
			for (let row = 0; row < this.dim; row++) {
				let $tr = $("<tr></tr>");
				for (let col = 0; col < this.dim; col++) {
					let square = this.squares[col][row];
					const $td = square.createDOM("Board", col, row);			
					if (col == this.middle && row == this.middle)
						$td.addClass('StartField');
					else if (square.type != '_')
						$td.addClass('SpecialField'); // score multiplier
					$tr.append($td);
				}
				$table.append($tr);
			}
			return $table;
		}

		refreshDOM() {
			this.squares.forEach(col => col.forEach(s => s.refreshDOM()));
		}
	}

	return Board;
});
