/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node, jquery */

/**
 * A Rack is a set of tiles that a player can play from. It's
 * a 1D array of Square.
 */
define('game/Rack', ['game/Surface'], Surface => {

	/**
	 * A Rack is a 1-column Surface
	 */
	class Rack extends Surface {

		/**
		 * @param size a rack size, or an array of Tile (for tests)
		 */
		constructor(size) {
			super(typeof size === 'number' ? size : size.length, 1,
				  () => '_');
			if (typeof size !== 'number')
				for (let tile of size)
					this.addTile(tile);
		}

		/**
		 * Debug
		 */
		toString() {
			return `Rack ${this.tiles().join(',')}`;
		}

		/**
		 * @override Surface
		 * One dimensional
		 */
		at(col) {
			return super.at(col, 0);
		}

		/**
		 * Add a Tile to the rack
		 * @param tile the Tile to add, must != null
		 * @return the col of the added tile
		 */
		addTile(tile) {
			let col = -1;
			this.forEachSquare(square => {
				if (!square.tile) {
					square.placeTile(tile);
					col = square.col;
					return true;
				}
			});
			return col;
		}

		/**
		 * Get the number of squares currently occupied by a tile
		 */
		squaresUsed() {
			let count = 0;
			this.forEachSquare(square => {
				if (square.tile) count++;
			});
			return count;
		}

		/**
		 * Get an array of the tiles currently on the rack
		 */
		tiles() {
			let tiles = [];
			this.forEachSquare(square => {
				if (square.tile) tiles.push(square.tile);
			});
			return tiles;
		}

		/**
		 * Get an array of the letters currently on the rack
		 */
		letters() {
			return this.tiles().map(tile => tile.letter);
		}

		/**
		 * Find a Tile on the rack that can represent the given letter.
		 * If a normal letter can't be found, a blank will be used.
		 * @param letter the letter to find
		 * @return a Square
		 */
		findSquare(letter) {
			let square;
			this.forEachSquare(sq => {
				if (sq.tile) {
					if (!square && sq.tile.isBlank
					   || sq.tile.letter === letter)
						square = sq;
				}
			});

			return square;
		}

		/**
		 * Find the first Tile the rack that has the given letter. Does
		 * not modify the rack.
		 * @param letter the letter to find
		 * @return a Tile or null
		 */
		findTile(letter) {
			return this.findSquare(letter).tile;
		}

		/**
		 * Find and remove a tile from the rack. Will match the requested
		 * tile within the Rack and return it.
		 * @param remove the Tile to remove, or null to remove any tile
		 * @return the removed tile
		 */
		removeTile(remove) {
			const square = this.findSquare(remove.letter, true);
			if (!square)
				// Terminal, no point in translating
				throw Error('Cannot find a tile on the rack for '
							+ remove.letter);
			const tile = square.tile;
			tile.letter = remove.letter;
			square.placeTile(null);
			return tile;
		}

		/**
		 * Shuffle tile positions within the rack
		 * @return this
		 */
		shuffle() {
			const len = this.cols;
			function random() {
				return Math.floor(Math.random() * len);
			}
			for (let i = 0; i < 16; i++) {
				const from = this.at(random());
				const to = this.at(random());
				const tmp = from.tile;
				from.tile = to.tile;
				to.tile = tmp;
			}
			return this;
		}

		/**
		 * Create the DOM for the Rack.
		 * @param idbase base of id's to uniquely identify this rack
		 * @param underlay a string of letters to use as background of
		 * the rack squares. This is in place of a label.
		 */
		createDOM(idbase, underlay) {
			const $table = $('<table class="rackTable"></table>');
			const $tr = $(`<tr></tr>`);
			let idx = 0;
			this.forEachSquare(square => {
				const $td = square.createDOM(idbase, idx);
				if (underlay) {
					const letter = underlay.charAt(idx);
					$td.addClass('bgLetterContainer');
					$td.append(`<div class='bgLetter'>${letter}</div>`);
				}
				$tr.append($td);
				idx++;
			});
			$table.append($tr);
			this.refreshDOM();
			return $table;
		}
	}

	return Rack;
});
