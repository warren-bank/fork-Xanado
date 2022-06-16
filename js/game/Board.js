/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, node, jquery */

define("game/Board", ["game/Surface", "game/Tile", "game/Move"], (Surface, Tile, Move) => {

	/**
	 * The square game board.
     * @extends Surface
	 */
	class Board extends Surface {

		/**
         * Row of middle square on board.
         * @member {number}
         */
        midrow;

		/**
         * Column of middle square on board.
         * @member {number}
         */
        midcol;

		/**
		 * @param {Edition} edition the edition defining the board layout
		 */
		constructor(edition) {
			super("Board", edition.cols, edition.rows,
				  (col, row) => edition.squareType(col, row));

			this.midrow = Math.floor(edition.rows / 2);
			this.midcol = Math.floor(edition.cols / 2);
		}

		/**
		 * Load the board from the string representation output by
		 * toString. This is for use in tests.
		 * @param {string} sboard string representation of the board
		 * @param {Edition} edition the edition defining the board layout.
		 * This has to be provided because we don't cache the actual
		 * Edition in the Board.
		 */
		parse(sboard, edition) {
			const rows = sboard.split("\n");
			for (let row = 0; row < this.rows; row++) {
				const r = rows[row].split("|");
				for (let col = 0; col < this.cols; col++) {
					const letter = r[col + 1];
					if (letter != " ") {
						// Treat lower-case letters as cast blanks.
						// May not work in non-latin languages.
						const isBlank = (letter.toUpperCase() != letter);
						const tile = new Tile({
							letter: letter.toUpperCase(),
							isBlank: isBlank,
							score: isBlank ? 0 : edition.letterScore(letter)
						});
						this.at(col, row).placeTile(tile, true);
					}
				}
			}
		}


		/**
		 * Given a play at col, row, compute it's score. Used in
         * findBestPlay, and must perform as well as possible. Read
         * the description of `analysePlay` to understand the
         * difference between these two related functions.
         * Note: does *not* include any bonuses due to number of tiles played.
		 * @param {number} col the col of the LAST letter
		 * @param {number} row the row of the LAST letter
		 * @param {number} dcol 1 if the word being played across
		 * @param {number} drow 1 if the word is being played down
		 * @param {Tile[]} tiles a list of tiles that are being placed
		 * @param {string[]?} words optional list to be populated with
		 * words that have been created by the play
		 * @return {number} the score of the play.
		 */
		scorePlay(col, row, dcol, drow, tiles, words) {
			// Accumulator for the primary word being formed by the tiles
			let wordScore = 0;

			// Accumulator for crossing words scores.
			let crossWordsScore = 0;

			// Multipler for the main word
			let wordMultiplier = 1;

			for (let tile of tiles) {
				const c = tile.col;
				const r = tile.row;
				let letterScore = tile.score;
				const square = this.at(c, r);
				if (square.tileLocked) {
					wordScore += letterScore;
					continue; // pre-existing tile, no bonuses
				}

				// Letter is being placed, so letter multiplier applies to all
				// new words created, including cross words
				letterScore *= square.letterScoreMultiplier;

				wordScore += letterScore;

				// Multiplier for any new words that cross this letter
				const crossWordMultiplier = square.wordScoreMultiplier;
				wordMultiplier *= crossWordMultiplier;

				// This is a new tile, need to analyse cross words and
				// apply bonuses
				let crossWord = "";
				let crossWordScore = 0;

				// Look left/up
				for (let cp = c - drow, rp = r - dcol;
					 cp >= 0 && rp >= 0 && this.at(cp, rp).tile;
					 cp -= drow, rp -= dcol) {
					const tile = this.at(cp, rp).tile;
					crossWord = tile.letter + crossWord;
					crossWordScore += tile.score;
				}

				crossWord += tile.letter;

				// Look right/down
				for (let cp = c + drow, rp = r + dcol;
					 cp < this.cols && rp < this.rows
					 && this.at(cp, rp).tile;
					 cp += drow, rp += dcol) {
					const tile = this.at(cp, rp).tile;
					crossWord += tile.letter;
					crossWordScore += tile.score;
				}

				if (crossWordScore > 0) {
					// This tile (and bonuses) contribute to cross words
					crossWordScore += letterScore;
					crossWordScore *= crossWordMultiplier;
					if (words)
						words.push({
                            word: crossWord,
                            score: crossWordScore
                        });

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

			return wordScore;
		}

		/**
		 * True if one of the neighbours of [col, row] is already occupied by
		 * a tile that was placed in a previous move
		 * @param {number} col 0-based row
		 * @param {number} row 0-based row
		 */
		touchingOld(col, row) {
			return (
				(col > 0 && this.at(col - 1, row).tile
				 && this.at(col - 1, row).tileLocked)
				|| (col < this.cols - 1 && this.at(col + 1, row).tile
					&& this.at(col + 1, row).tileLocked)
				|| (row > 0 && this.at(col, row - 1).tile
					&& this.at(col, row - 1).tileLocked)
				|| (row < this.rows - 1 && this.at(col, row + 1).tile
					&& this.at(col, row + 1).tileLocked));
		}

		/**
		 * Calculate score for all words that involve new tiles.
		 * This is used on the UI side, when the placement may be fragmented
		 * and difficult to analyse.
		 * @param {Move.wordSpec[]} words list to update
		 * @return {number} the total score
         * @private
		 */
		scoreNewWords(words) {
			let totalScore = 0;
			let row, col;

			const taste = (dcol, drow) => {
				let wordScore = 0;
				let letters = "";
				let wordMultiplier = 1;
				let isNewWord = false;
				while (col < this.cols
					   && row < this.rows
					   && this.at(col, row).tile) {
					const square = this.at(col, row);
					let letterScore = square.tile.score;
					isNewWord = isNewWord || !square.tileLocked;
					if (!square.tileLocked) {
						letterScore *= square.letterScoreMultiplier;
						wordMultiplier *= square.wordScoreMultiplier;
					}
					wordScore += letterScore;
					letters += square.tile.letter;
					col += dcol;
					row += drow;
				}
				if (isNewWord) {
					wordScore *= wordMultiplier;
					totalScore += wordScore;
					words.push({
						word: letters,
						score: wordScore
					});
				}
			};

			for (row = 0; row < this.rows; row++)
				for (col = 0; col < this.cols - 1; col++)
					if (this.at(col, row).tile && this.at(col + 1, row).tile)
						taste(1, 0);
			
			for (col = 0; col < this.cols; col++)
				for (row = 0; row < this.rows - 1; row++)
					if (this.at(col, row).tile && this.at(col, row + 1).tile)
						taste(0, 1);
			
			return totalScore;
		}

		/**
		 * UI-side move calculation. Constructs a {@link Move}.
		 * `analysePlay` and `scorePlay` do essentially the same job;
		 * calculate the score for a given play. They differ in
		 * respect of their application; `analysePlay` is used
		 * client-side to calculate a move made by a human and has to
		 * be tolerant of disconnected plays and other errors. It
		 * works on a board with tiles placed but not locked.
		 * `scorePlay` is used to calculate the score for a play being
		 * constructed on the server side by a robot, and has to
		 * perform as well as possible. Note that neither
		 * `analysePlay` nor `scorePlay` calculate bonuses for number
		 * of tiles played.
		 * @return {(Move|string)} Move, or a string if there is a problem
		 */
		analysePlay() {
			// Check that the start field is occupied
			if (!this.at(this.midcol, this.midrow).tile)
				return /*i18n*/"Centre must be used";

			// Determine that the placement of the Tile(s) is legal

			// Find top-leftmost placed tile
			let topLeftX, topLeftY, tile;
			this.forEachTiledSquare((square, col, row) => {
				if (square.tileLocked)
					return false;
				tile = square.tile;
				topLeftX = col;
				topLeftY = row;
				return true;
			});

			// Remember which newly placed tile positions are legal
			const legalPlacements = new Array(this.cols);
			for (let col = 0; col < this.cols; col++)
				legalPlacements[col] = new Array(this.rows);

			legalPlacements[topLeftX][topLeftY] = true;

			let isTouchingOld = this.touchingOld(topLeftX, topLeftY);
			let horizontal = false;
			for (let col = topLeftX + 1; col < this.cols; col++) {
				if (this.at(col, topLeftY).isEmpty())
					break;
				if (!this.at(col, topLeftY).tileLocked) {
					legalPlacements[col][topLeftY] = true;
					horizontal = true;
					isTouchingOld =
					isTouchingOld || this.touchingOld(col, topLeftY);
				}
			}

			if (!horizontal) {
				for (let row = topLeftY + 1; row < this.rows; row++) {
					if (!this.at(topLeftX, row).tile) {
						break;
					} else if (!this.at(topLeftX, row).tileLocked) {
						legalPlacements[topLeftX][row] = true;
						isTouchingOld =
						isTouchingOld || this.touchingOld(topLeftX, row);
					}
				}
			}

			if (!isTouchingOld && !legalPlacements[this.midcol][this.midrow])
				return /*i18n*/"Disconnected placement";

			// Check whether there are any unconnected placements
			let totalTiles = 0;
			let disco = false;
			this.forEachTiledSquare((square, col, row) => {
				totalTiles++;
				disco = disco || (!square.tileLocked && !legalPlacements[col][row]);
			});
			
			if (disco)
				return /*i18n*/"Disconnected placement";

			if (totalTiles < 2)
				return /*i18n*/"First word must be at least two tiles";

			const placements = [];
			this.forEachTiledSquare(square => {
				if (!square.tileLocked) {
					placements.push(square.tile);
				}
			});
	
			const words = [];
			const score = this.scoreNewWords(words);
			return new Move(
				{
					placements: placements,
					score: score,
					words: words
				});
		}

		/**
		 * Create the UI representation
		 * @return {jQuery}
		 */
		$ui() {
			const $table = $("<table></table>");
			for (let row = 0; row < this.rows; row++) {
				const $tr = $("<tr></tr>");
				for (let col = 0; col < this.cols; col++) {
					const square = this.at(col, row);
					const $td = square.$ui("Board", col, row);
					if (col == this.midcol && row == this.midrow)
						$td.addClass("StartField");
					else if (square.type != "_")
						$td.addClass("score-multiplier"); // score multiplier
					$tr.append($td);
				}
				$table.append($tr);
			}
			return $table;
		}

		/**
         * @override
		 */
        /* istanbul ignore next */
		toString() {
			let s = `Board ${this.cols}x${this.rows}\n`;

			for (let row = 0; row < this.rows; row++) {
				const r = [];
				for (let col = 0; col < this.cols; col++) {
					const square = this.at(col, row);
					const t = square.tile;
					if (t) {
						// Show cast blanks using lower case letters
						// May not work in non-Latin languages.
						if (t.isBlank)
							r.push(t.letter.toLowerCase());
						else
							r.push(t.letter);
					} else {
						if (square.letterScoreMultiplier > 1)
							r.push(square.letterScoreMultiplier);
						else if (square.wordScoreMultiplier > 1)
							r.push(4 + square.wordScoreMultiplier);
						else
							r.push(" ");
					}
				}
				s += `|${r.join("|")}|\n`;
			}
			return s;
		}
	}

	return Board;
});
