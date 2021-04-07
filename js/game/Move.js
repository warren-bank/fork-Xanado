/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

/**
 * A Move is a collection of tile Placements, and the total score achieved
 * for the move. We also record the words created by the move.
 */
define("game/Move", () => {

	class Move {
		
		constructor(placements, words, score) {
			// words created by the move, array of { word:, score: }
			this.words = words || [];
			// total score for all words
			this.score = score || 0;
			// list of Tile
			this.placements = placements || [];
		}

		/**
		 * Add a word to the move, aggregating the score
		 */
		addWord(word, score) {
			this.words.push({ word: word, score: score });
			this.score += score;
		}
		
		/**
		 * Add a Tile placement to the move
		 * @param tile the Tile to add
		 */
		addPlacement(tile) {
			this.placements.push(tile);
		}

		toString() {
			return `Play ${this.placements} words ${this.words} for $this.score}`;
		}
	}

	return Move;
});
