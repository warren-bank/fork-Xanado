/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

/**
 * Result of the user (or robot player) placing a tile on the board.
 */
define("game/Placement", () => {

	class Placement {
		/*
		 * @param letter letter to place
		 * @param col col column
		 * @param row row row
		 * @param isBlank true if this is a blank tile. The letter indicate
		 * what it is cast to.
		 */
		constructor(letter, col, row, isBlank) {
			this.letter = letter;
			this.col = col;
			this.row = row;
			this.isBlank = isBlank;
		}
	}

	return Placement;
});
		
