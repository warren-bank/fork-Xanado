/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

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

			this.shake();
		}

		/**
		 * Randomize tiles in-place using Durstenfeld shuffle
		 */
		shake() {
			for (var i = this.tiles.length - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1));
				var temp = this.tiles[i];
				this.tiles[i] = this.tiles[j];
				this.tiles[j] = temp;
			}
		}

		/**
		 * Get a single random tile from the bag. Assumes the bag is
		 * already randomised, and there is no need to shuffle it
		 * again.
		 * @return a Tile, or null if there are no tiles left
		 */
		getRandomTile() {
			if (this.tiles.length > 0)
				return this.tiles.pop();
			return null;
		}

		/**
		 * Remove count random tiles from the bag. Assumes the bag is
		 * already randomised, and there is no need to shuffle it
		 * again.
		 * @return an array of 'count' Tile. If there aren't enough
		 * tiles in the bag, may return a shorter array.
		 */
		getRandomTiles(count) {
			const tiles = [];
			for (let i = 0; this.tiles.length > 0 && i < count; i++)
				tiles.push(this.tiles.pop());
			return tiles;
		}

		/**
		 * Return a tile to the bag, and give it a shoogle so the same
		 * tile doesn't re-emerge.
		 */
		returnTile(tile) {
			this.tiles.push(tile);
			this.shake();
		}

		/**
		 * Return a set of tiles to the bag, and give it a shoogle so
		 * the tiles don't re-emerge in the same order.
		 */
		returnTiles(tiles) {
			this.tiles = this.tiles.concat(tiles);
			this.shake();
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
