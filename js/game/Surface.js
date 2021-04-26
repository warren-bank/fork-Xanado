/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node, jquery */

/**
 * Base class of a tile holder (Rack or Board)
 */
define("game/Surface", ["game/Square"], Square => {

	class Surface {

		/**
		 * @param cols number of columns
		 * @param rows number of rows (1 for a rack)
		 * @param type function(col, row) returning the square type
		 */
		constructor(cols, rows, type) {
			this.cols = cols;
			this.rows = rows;
			this.squares = [];
			for (let i = 0; i < cols; i++) {
				const row = [];
				for (let j = 0; j < rows; j++)
					row.push(new Square(type(i, j), this, i, j));
				this.squares.push(row);
			}
		}

		/**
		 * Get the square at [col][row]
		 */
		at(col, row) {
			return this.squares[col][row];
		}

		/**
		 * Call fn(square, col, row) on every square, until fn returns true
		 */
		forEachSquare(fn) {
			for (let c = 0; c < this.cols; c++)
				for (let r = 0; r < this.rows; r++)
					if (fn(this.squares[c][r], c, r))
						return;
		}

		/**
		 * Remove all tiles
		 */
		empty() {
			this.forEachSquare(square => square.placeTile(null));
		}

		/**
		 * Determine if the surface is empty of tiles
		 */
		isEmpty() {
			return this.tiles().length === 0;
		}

		/**
		 * Refresh the DOM for all squares
		 */
		refreshDOM() {
			this.forEachSquare(s => s.refreshDOM());
		}
	}

	return Surface;
});
