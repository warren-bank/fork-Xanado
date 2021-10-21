/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

define('game/Move', () => {

	/**
	 * A Move is a collection of tile placements, and the total score
	 * achieved for the move. We also record the words created by the
	 * move. It is used to send a human player's play to the server,
	 * which then sends a matching {@link Turn} to every player.
	 */
	class Move {

		/**
		 * @param {object} spec optional spec
		 * @param {Tile[]} spec.placements optional list of tiles.
		 * @param {Object[]} spec.words words created
		 * @param {number} spec.words.score - score for the word
		 * @param {string} spec.words.word - the word
		 * @param {number} spec.score total score for play
		 * @param {number} spec.bonus bonus for the play (included in score)
		 */
		constructor(spec) {
			this.score = 0;
			this.bonus = 0;
			this.placements = [];
			if (spec)
				Object.getOwnPropertyNames(spec).forEach(
					p => this[p] = spec[p]);
		}

		/**
		 * Add a Tile placement to the move
		 * @param {Tile} tile the Tile to add
		 */
		addPlacement(tile) {
			this.placements.push(tile);
		}

		toString() {
			const pl = this.placements.map(t => t.toString(true));
			const w = this.words.map(w => `${w.word}(${w.score})`);
			return `Play ${pl} words ${w} for ${this.score}`;
		}
	}

	return Move;
});
