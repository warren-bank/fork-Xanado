/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

/**
 * A Move is a collection of tile Placements, and the total score achieved
 * for the move. We also record the words created by the move. It is
 * used to send a human player's play to the server, which then responds
 * with a turn (or several, if robots are playing)
 */
define('game/Move', () => {

	class Move {

		/**
		 * @param placements a list of Tile.
		 * has an error
		 * @param words array of {word: score:}
		 * @param score total score for play
		 */
		constructor(placements, words, score) {
			// words created by the move, array of { word:, score: }
			this.words = words || [];
			// total score for all words
			this.score = score || 0;
			// list of Tile
			this.placements = placements || [];
		}

		/**
		 * Add a Tile placement to the move
		 * @param tile the Tile to add
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
