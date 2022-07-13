/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define("game/LetterBag", [
  "platform", "game/Tile"
], (Platform, Tile) => {

	/**
	 * The bag of letters during a game.
	 */
	class LetterBag {

    /**
     * Array of Tiles in the bag
     * @member {Tile[]}
     */
		tiles = [];

		/**
     * Array of all the letters in the bag, excluding blank.
     * @member {string}
     */
		legalLetters = [];

		/**
		 * Construct a new letter bag using the distribution for the
		 * given edition
		 * @param {Edition} edition the Edition defining the bag contents
     * @param {boolean?} predictable set to turn off sshuffling the
     * bag contents (for testing)
		 */
		constructor(edition, predictable) {
			for (let letter of edition.bag) {
        // legalLetters is an array, not a string, to support
        // multi-character tiles
				if (!letter.isBlank)
					// Not blank
					this.legalLetters.push(letter.letter);

				const count = Math.floor(letter.count);
				for (let n = 0; n < count; ++n) {
					const tile = new Tile({
						letter:	letter.letter,
						score: letter.score
					});
					if (letter.isBlank)
						tile.isBlank = true;
					this.tiles.push(tile);
				}
			}

      /* istanbul ignore if */
      if (predictable)
        /**
         * Set to disable shuffling the bag. This is used when
         * replaying moves, when we need a predictable set for tiles
         * to be delivered next out of the bag.
         * @member {boolean?}
         */
        this.predictable = predictable;

			this.shake();
		}

		/**
		 * Test bag for emptiness
		 * @return {boolean} true if there are no tiles in the bag
		 */
		isEmpty() {
			return this.tiles.length === 0;
		}

		/**
		 * Randomize tiles in-place using Durstenfeld shuffle. Randomness
     * can be disabled by setting {@linkcode LetterBag#predictable}
		 */
		shake() {
      if (this.predictable)
        return;

			for (let i = this.tiles.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				const temp = this.tiles[i];
				this.tiles[i] = this.tiles[j];
				this.tiles[j] = temp;
			}
		}

		/**
		 * Get a single random tile from the bag. Assumes the bag is
		 * already randomised, and there is no need to shuffle it
		 * again.
		 * @return {Tile} a Tile or null if there are no tiles left
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
		 * @return {Tile[]} 'count' Tile. If there aren't enough
		 * tiles in the bag, may return a shorter array.
		 */
		getRandomTiles(count) {
			const tiles = [];
			Platform.assert(count >= 0);
			for (let i = 0; this.tiles.length > 0 && i < count; i++)
				tiles.push(this.tiles.pop());
			return tiles;
		}

		/**
		 * Return a tile to the bag, and give it a shoogle so the same
		 * tile doesn't always re-emerge next.
		 * @param {Tile} tile tile to return to bag
		 */
		returnTile(tile) {
			this.tiles.push(tile.reset());
			this.shake();
		}

		/**
		 * Return an array of tiles to the bag, and give it a shimmy
		 * @param {Tile[]} tiles tiles to return to bag
		 */
		returnTiles(tiles) {
			for (const tile of tiles)
        this.tiles.push(tile.reset());
			this.shake();
		}

		/**
		 * Remove a matching tile from the bag. Either the exact tile
     * will be matched or a tile that represents the same letter.
     * Blanks only match blanks.
		 * @param {Tile} tile tile to match in the bag
     * @return {Tile?} the tile removed, or undefined if it wasn't found
		 */
    removeTile(tile) {
      for (let i = 0; i < this.tiles.length; i++) {
        const t = this.tiles[i];
        if (t === tile || (t.isBlank && tile.isBlank)
            || (!t.isBlank && !tile.isBlank && t.letter === tile.letter))
        {
          this.tiles.splice(i, 1);
          return t;
        }
      }
      return undefined;
    }

    /**
     * Take a list of matching tiles out of the letter bag.
     * @param {Tile[]} tiles list of tiles to match and remove
     * @return {Tile[]} list of tiles removed from the bag 
     */
    removeTiles(tiles) {
      const unbagged = [];
			for (const tile of tiles)
	      unbagged.push(this.removeTile(tile));
      return unbagged;
    }

		/**
		 * How many tiles remain?
		 * @return {number} number of tiles still in the bag
		 */
		remainingTileCount() {
			return this.tiles.length;
		}

		/**
		 * Return an unsorted list of letters in the bag
		 */
		letters() {
			return this.tiles.map(tile => tile.letter);
		}

    /* istanbul ignore next */
		/**
		 * Generate a simple string representation of the player
     * @override
		 */
		toString() {
      return "(" + this.letters().sort().join("") + ")";
    }
	}
	return LetterBag;
});
