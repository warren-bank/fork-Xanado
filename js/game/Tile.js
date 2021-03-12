define("game/Tile", () => {
	class Tile {
		/**
		 * @param letter character represented by this tile
		 * @param score value of this tile
		 */
		constructor(letter, score) {
			this.letter = letter; // char
			this.score = score;
		}

		isBlank() {
			return this.score == 0;
		}

		toString() {
			return "Tile: [" + (this.isBlank() ? "blank" : this.letter)
			+ `] --> ${this.score}`;
		}
	}

	return Tile;
});
