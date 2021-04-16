/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node, jquery */

/**
 * A Rack is a set of tiles that a player can play from. It's
 * a 1D array of Square.
 */
define("game/Rack", ["game/Square"], Square => {

	class Rack {
		constructor(size) {
			let tiles;
			if (typeof size !== "number") {
				tiles = size;
				size = tiles.length;
			}
			this.squares = [];

			for (let col = 0; col < size; col++) {
				const sq = new Square('_', this, col);
				if (tiles)
					sq.tile = tiles[col];
				this.squares.push(sq);
			}
		}

		/**
		 * Add a Tile to the rack
		 * @param tile the Tile to add, must != null
		 * @return the col of the added tile
		 */
		addTile(tile) {
			for (let sq of this.squares) {
				if (!sq.tile) {
					sq.placeTile(tile);
					return sq.col;
				}
			}
			// Terminal, no point in translating
			throw Error("Nowhere to put tile");
		}

		/**
		 * Get the square at a position
		 */
		at(col) {
			return this.squares[col];
		}

		isEmpty() {
			return !this.squares.find(s => s.tile);
		}

		/**
		 * Remove all tiles from the rack
		 */
		empty() {
			this.squares.forEach(s => s.placeTile(null));
		}

		/**
		 * Get the number of squares currently occupied by a tile
		 */
		squaresUsed() {
			return this.squares.reduce(
				(acc, s) => acc += (s.tile ? 1 : 0), 0)
		}

		/**
		 * Get an array of the tiles currently on the rack
		 */
		tiles() {
			return this.squares.reduce(
				(accu, square) => {
					if (square.tile)
						accu.push(square.tile);
					return accu;
				},
				[]);
		}

		/**
		 * Get an array of the letters currently on the rack
		 */
		letters() {
			return this.tiles().map(tile => tile.letter);
		}

		/**
		 * Find the first Tile the rack that can represent the given letter.
		 * @param letter the letter to find
		 * @return a Square
		 */
		findSquare(letter) {
			let blank = null; // square containing the first blank found
			const square = this.squares.find(
				square => {
					const tile = square.tile;
					if (tile) {
						if (tile.isBlank && !blank)
							blank = square;
						else if (tile.letter === letter)
							return true;
					}
				});

			if (square)
				return square;

			return blank;
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
		 * @param remove the Tile to remove.
		 * @return the removed tile
		 */
		removeTile(remove) {
			const square = this.findSquare(remove.letter, true);
			if (!square)
				// Terminal, no point in translating
				throw Error("Cannot find a tile on the rack for "
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
			const len = this.squares.length;
			function random(i) {
				return Math.floor(Math.random() * len);
			}
			for (let i = 0; i < 16; i++) {
				let from = this.squares[random()];
				let to = this.squares[random()];
				let tmp = from.tile;
				from.tile = to.tile;
				to.tile = tmp;
			}
			return this;
		}

		toString() {
			return "[" + this.squares.map(
				s => s.tile ? s.tile.letter : '.')
			+ "]";
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
			for (let idx = 0; idx < this.squares.length; idx++) {
				const square = this.squares[idx];
				const $td = square.createDOM(idbase, idx);
				if (underlay) {
					const letter = underlay.charAt(idx);
					$td.addClass("bgLetterContainer");
					$td.append(`<div class="bgLetter">${letter}</div>`);
				}
				$tr.append($td);
			}
			$table.append($tr);
			this.refreshDOM();
			return $table;
		}

		refreshDOM() {
			this.squares.forEach(s => s.refreshDOM());
		}
	}

	return Rack;
});
