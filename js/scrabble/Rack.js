define("scrabble/Rack", ["underscore", "triggerEvent", "scrabble/Square"], (_, triggerEvent, Square) => {

	class Rack {
		constructor(size) {
			this.squares = [];
			
			for (let x = 0; x < size; x++) {
				const square = new Square('Normal', this, x, -1);
				this.squares[x] = square;
			}
			
			triggerEvent('RackReady', [ this ]);
		}
		
		emptyTiles() {
			for (let x = 0; x < this.squares.length; x++) {
				const square = this.squares[x];
				
				square.placeTile(null);
			}
		}
		
		toString() {
			return `Rack ${this.squares.length}`;
		}
		
		letters() {
			return _.reduce(
				this.squares,
				(accu, square) => {
					if (square.tile) {
						accu.push(square.tile.letter);
					}
					return accu;
				},
				[]);
		}
		
		findLetterSquare(letter, includingBlank) {
			let blankSquare = null;
			const square = _.find(
				this.squares,
				square => {
					if (square.tile) {
						if (square.tile.isBlank() && !blankSquare) {
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
	}

	return Rack;
});
