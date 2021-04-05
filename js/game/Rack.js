/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

/**
 * A Rack is a set of tiles that a player can play from. It's effectively
 * a 1D board.
 */
define("game/Rack", ["triggerEvent", "game/Square"], (triggerEvent, Square) => {

	class Rack {
		constructor(size) {
			this.squares = [];
			
			for (let col = 0; col < size; col++)
				this.squares.push(new Square('_', this, col));
			
			triggerEvent('RackReady', [ this ]);
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
		 * Get an array of the letters currently on the rack
		 */
		letters() {
			return this.squares.reduce(
				(accu, square) => {
					if (square.tile)
						accu.push(square.tile.letter);
					return accu;
				},
				[]);
		}

		/**
		 * Find the first square on the rack that has the given letter
		 * @param letter the letter to find
		 * @param includingBlank if the search is to include a match
		 * for the blank tile (which can potentially match any letter)
		 * @return a Square or null
		 */
		findLetterSquare(letter, includingBlank) {
			let blankSquare = null;
			const square = this.squares.find(
				square => {
					if (square.tile) {
						if (square.tile.isBlank && !blankSquare) {
							blankSquare = square;
						} else if (square.tile.letter == letter) {
							return true;
						}
					}
				});
			if (square) {
				return square;
			} else if (includingBlank) {
				return blankSquare;
			} else {
				return null;
			}
		}

		toString() {
			return "[" + this.squares.map(s => s.tile ? s.tile.letter : "_")
			+ "]";
		}
	}

	return Rack;
});
