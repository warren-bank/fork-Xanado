define("scrabble/Tile", () => {
	class Tile {
		constructor(letter, score) {
			this.letter = letter;
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
