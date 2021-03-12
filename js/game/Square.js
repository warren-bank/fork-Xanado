define("game/Square", ["triggerEvent"], triggerEvent => {

	const STAR = '\u2605';

	/**
	 * A square on the game board or rack. A Tile holder with
	 * some underlying attributes; a position, and owner, and
	 * a type that dictates the score multipliers that apply.
	 */
	class Square {
		constructor(type, owner, x, y) {
			this.type = type; // /^[QqTtSs_]$/ see Board.js
			this.owner = owner;
			this.x = x;
			this.y = y;
			this.letterScoreMultiplier = 1;
			this.wordScoreMultiplier = 1;
			switch (this.type) {
			case 'd': this.letterScoreMultiplier = 2; break;
			case 't': this.letterScoreMultiplier = 3; break;
			case 'q': this.letterScoreMultiplier = 4; break;
			case 'D': this.wordScoreMultiplier = 2; break;
			case 'T': this.wordScoreMultiplier = 3; break;
			case 'Q': this.wordScoreMultiplier = 4; break;
			}
			// Tile placed
			this.tile = null;
			// True if the tile cannot be moved in the UI i.e. was
			// placed in a prior move. Locked tiles don't gather
			// bonuses.
			this.tileLocked = false;
		}

		/**
		 * Place a tile on this square
		 */
		placeTile(tile, locked) {
			if (tile && this.tile)
				throw Error(`square already occupied: ${this}`);

			if (tile) {
				this.tile = tile;
				this.tileLocked = locked;
			} else {
				delete this.tile;
				delete this.tileLocked;
			}

			triggerEvent('SquareChanged', [ this ]);
		}

		/**
		 * Get the letter score for the tile placed on the square
		 * Does not apply wordMultiplier. Locked tiles only score their
		 * face value.
		 */
		letterScore() {
			if (!this.tile)
				return 0;
			if (this.tileLocked)
				return this.tile.score;
			return this.tile.score * this.letterScoreMultiplier;
		}
		
		/**
		 * Get the text to put in the square on the board UI.
		 */
		scoreText(middle) {
			switch (this.type) {
			case 'D':
				return (this.x == middle && this.y == middle)
				? STAR : "DOUBLE WORD SCORE";
			case 'T':
				return "TRIPLE WORD SCORE";
			case 'Q':
				return "QUAD WORD SCORE";
			case 'd':
				return "DOUBLE LETTER SCORE";
			case 't':
				return "TRIPLE LETTER SCORE";
			case 'q':
				return "QUAD LETTER SCORE";
			default:
				return "";
			}
		}

		/**
		 * Debug
		 */
		toString() {
			let string =  `${this.scoreText()} square @ ${this.x}`;
			if (this.y != -1) {
				string += ',' + this.y;
			}
			if (this.tile) {
				string += ` => ${this.tile}`;
				if (this.tileLocked)
					string += ' (Locked)';
			}
			return string;
		}
	}

	return Square;
});
