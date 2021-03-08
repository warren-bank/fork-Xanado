define("scrabble/LetterBag", ["scrabble/Tile"], (Tile) => {

	class LetterBag {

		/**
		 * Construct a new letter bag using the distribution for the given
		 * language. These numbers are for a 15x15 board, and correspond to
		 * a multiplier of 1. Increase the multiplier to produce a letter bag
		 * that suits bigger boards (and numbers of players)
		 */
		constructor(language, multiplier) {
			// Tiles in the bag
			this.tiles = [];
			// String of all the letters in the bag, except blank
			this.legalLetters = '';
			this.language = language;
			this.multiplier = multiplier;
		}

		/**
		 * Return a promise to fill the letterbag with letters.
		 */
		ready() {
			return new Promise(resolve => {
				requirejs([`scrabble/letters/${this.language}`], letterDistribution => {
					for (let i = 0; i < letterDistribution.length; ++i) {
						const letterDefinition = letterDistribution[i];
						
						if (letterDefinition.letter) {
							// Not blank
							this.legalLetters += letterDefinition.letter;
						}
						
						const count = Math.floor(letterDefinition.count * this.multiplier);
						for (let n = 0; n < count; ++n) {
							const tile = new Tile(
								letterDefinition.letter || " ", letterDefinition.score);
							this.tiles.push(tile);
						}
					}
					console.log(`Constructed ${this.language} LetterBag with ${this.tiles.length} tiles`);
					resolve();
				});
			});
		}
		
		shake() {
			const count = this.tiles.length;
			for (let i = 0; i < count * 3; i++) {
				const a = Math.floor(Math.random() * count);
				const b = Math.floor(Math.random() * count);
				const tmp = this.tiles[b];
				this.tiles[b] = this.tiles[a];
				this.tiles[a] = tmp;
			}
		}

		getRandomTile() {
			this.shake();

			return this.tiles.pop();
		}

		getRandomTiles(count) {
			this.shake();

			const retval = [];
			for (let i = 0; this.tiles.length && (i < count); i++) {
				retval.push(this.tiles.pop());
			}
			return retval;
		}

		returnTile(tile) {
			this.tiles.push(tile);
		}

		returnTiles(tiles) {
			this.tiles = this.tiles.concat(tiles);
		}

		remainingTileCount() {
			return this.tiles.length;
		}
	}
	return LetterBag;
});
