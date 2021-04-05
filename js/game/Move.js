/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

/**
 * A Move is a collection of placements, and the total score achieved
 * for the move. We also record the words created by the move.
 */
define("game/Move", [ "game/Placement" ], (Placement) => {

	class Move {
		
		constructor() {
			this.words = [];      // words created by the move, array of { word:, score: }
			this.score = 0;       // total score for all words
			this.placements = []; // array of Placement
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
		 */
		addPlacement(letter, col, row, isBlank) {
			this.placements.push(new Placement(letter, col, row, isBlank));
		}
	}

	return Move;
});
