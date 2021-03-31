define("game/LetterBag", ["game/Tile"], (Tile) => {

	class LetterBag {

		/**
		 * Construct a new letter bag using the distribution for the
		 * given bag definition (@see game/Edition)
		 * @param edition the Edition defining the bag contents
		 */
		constructor(edition) {
			// Tiles in the bag
			this.tiles = [];
			// Array of all the letters in the bag, excluding blank
			this.legalLetters = [];

			for (let letterDefinition of edition.bag) {
				if (letterDefinition.letter)
					// Not blank
					this.legalLetters.push(letterDefinition.letter);
				
				const count = Math.floor(letterDefinition.count);
				for (let n = 0; n < count; ++n) {
					const tile = new Tile(
						letterDefinition.letter, letterDefinition.score);
					this.tiles.push(tile);
				}
			}
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

		/**
		 * Get a single random tile from the bag
		 * @return a Tile, or null if there are no tiles left
		 */
		getRandomTile() {
			this.shake();
			if (this.tiles.length > 0)
				return this.tiles.pop();
			return null;
		}

		/**
		 * Remove count random tiles from the bag.
		 * @return an array of 'count' Tile. If there aren't enough
		 * tiles in the bag, may return a shorter array.
		 */
		getRandomTiles(count) {
			this.shake();
			const tiles = [];
			for (let i = 0; this.tiles.length > 0 && i < count; i++)
				tiles.push(this.tiles.pop());
			return tiles;
		}

		/**
		 * Return a tile to the bag
		 */
		returnTile(tile) {
			this.tiles.push(tile);
		}

		/**
		 * Return a set of tiles to the bag
		 */
		returnTiles(tiles) {
			this.tiles = this.tiles.concat(tiles);
		}

		/**
		 * How many tiles remain?
		 */
		remainingTileCount() {
			return this.tiles.length;
		}
	}
	return LetterBag;
});
