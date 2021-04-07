/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

/**
 * A tile in a LetterBag, on a Board, or on a Rack, or during best move
 * computation.
 */
define("game/Tile", () => {
	class Tile {
		
		/**
		 * @param letter character(s) represented by this tile
		 * @param isBlank true if this tile is a blank (irresepective of letter)
		 * @param score value of this tile
		 * @param col optional column where the tile is placed
		 * @param row optional row where the tile is placed
		 */
		constructor(letter, isBlank, score, col, row) {
			// Caution; during gameplay, .letter for a blank will be cast
			// to a letter chosen by the player. When the tile is returned
			// to the rack, the letter will be reset to ' ' as isBlank is true.
			// However the letter will stick to the Tile when it is sent to
			// the server as part of the move. Henceforward that Tile will
			// be locked to the chosen letter.
			this.letter = letter || ' ';
			this.score = score || 0;
			this.isBlank = isBlank;
			this.col = col;
			this.row = row;
		}

		toString() {
			return `|${this.letter}(${this.score})|`;
		}
	}

	return Tile;
});
