/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/

define("game/Tile", () => {
	/**
	 * A tile in a LetterBag, on a Board, or on a Rack, or during best move
	 * computation.
	 */
	class Tile {

		/**
		 * Character(s) represented by this tile.
		 * Caution; during gameplay, .letter for a blank will be cast
		 * to a letter chosen by the player. When the tile is returned
		 * to the rack, the letter will be reset to " " as isBlank is true.
		 * However the letter will stick to the Tile when it is sent to
		 * the server as part of a move. Henceforward that Tile will
		 * be locked to the chosen letter.
		 * @member {string}
		 */
		letter = " ";

		/**
		 * value of this tile
		 * @member {number}
		 */
		score = 0;

		/**
		 * true if this tile is a blank (irresepective of letter)
		 * @member {boolean}
		 */
		isBlank = false;

		/**
		 * Column where the tile is placed
		 * @member {number}
		 */
		col = undefined;
			
		/**
		 * Row where the tile is placed
		 * @member {number}
		 */
		row = undefined;

		/**
		 * @param {Tile|object} spec optional Tile to copy or spec of tile
		 * @param {string} spec.letter character(s) represented by this tile
		 * @param {boolean} spec.isBlank true if this tile is a blank (irresepective of letter)
		 * @param {number} spec.score value of this tile
		 * @param {number} spec.col optional column where the tile is placed
		 * @param {number} spec.row optional row where the tile is placed
		 */
		constructor(spec) {
			if (spec)
				Object.getOwnPropertyNames(spec).forEach(
					p => this[p] = spec[p]);
		}

        /**
         * Remove positional information from the tile e.g. before
         * returning it to the bag or rack.
         * @return {Tile} this
         */
        reset() {
			delete this.row;
			delete this.col;
            if (this.isBlank)
                this.letter = " ";
            return this;
        }

		/**
		 * @override
		 */
        /* istanbul ignore next */
		toString() {
			let pl = typeof this.col === "number" ? `@${this.col}` : "";
            if (typeof this.row === "number")
                pl += `,${this.row}`;
            const b = this.isBlank ? "[]" : "";
			return `[${this.letter}${b}${pl}(${this.score})]`;
		}
    }

	return Tile;
});
