define("game/Tile", () => {
	class Tile {
		/**
		 * @param letter character(s) represented by this tile
		 * @param score value of this tile
		 */
		constructor(letter, score) {
			// Caution; during gameplay, .letter for a blank will be cast
			// to a letter chosen by the player. When the tile is returned
			// to the rack, the letter will be reset to ' ' as isBlank is true.
			// However the letter will stick to the Tile when it is sent to
			// the server as part of the move. Henceforward that Tile will
			// be locked to the chosen letter.
			this.letter = letter || ' ';
			this.score = score || 0;
			this.isBlank = !letter;
		}

		toString() {
			return "Tile: [" + (this.isBlank ? "blank" : this.letter)
			+ `] --> ${this.score}`;
		}
	}

	return Tile;
});
