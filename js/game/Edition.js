/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

/**
 * A Scrabble-like crossword game edition.
 *
 * Editions define the board layout and letter bag for a specific
 * Scrabble-like crossword game - Scrabble, Words With Friends, Lexulous,
 * or a game you've made yourself.
 *
 * Editions are only loaded once, and are subsequently kept in memory.
 * They are referred to by name in comms between the server and players,
 * and are not sent to the browser.
 */

define("game/Edition", () => {

	// Static DB of loaded Editions, indexed by name
	const editions = {};
	
	class Edition {
		
		/**
		 * @param data { bag:, layout:, rackCount:, swapCount: }
		 * layout: an array of strings, each representing a row of the
		 * Lower-right quadrant of the board, so 0,0 is the middle. Each
		 * character in the strings represents the scoring for that square
		 * encoded as follows:
		 * d = double letter, D = double word
		 * t = triple letter, T = triple word
		 *  q = quad letter, Q = quad word
		 * _ = normal
		 * bag: the initial bag of letters at the start of a game.
		 * Each letter is given by { letter: score: count: } where letter
		 * is a code point, score is the score for using that letter,
		 * and count is the number of letters in the bag. Blank is represented
		 * by an undefined letter. Note that the ordering is unimportant but
		 * if a dictionary is used, then there has to be a 1:1 correspondence
		 * between the alphabet used to generate the DAWG and the letters in
		 * the bag.
		 * rackCount: the number of tiles on a players rack
		 * swapCount: number of tiles swappable in a turn
		 */
		constructor(data) {
			this.layout = data.layout;
			this.bag = data.bag;
			this.rackCount = data.rackCount;
			this.swapCount = data.swapCount;
			this.bonuses = data.bonuses;
			
			this.scores = { }; // map letter->score
			
			this.dim = 2 * this.layout.length - 1;

			this.alphabeta = [];
			for (let tile of this.bag) {
				if (tile.letter)
					this.alphabeta.push(tile.letter);
				else {
					tile.letter = ' '; // blank
					tile.isBlank = true;
				}
				this.scores[tile.letter] = tile.score || 0;
			}
			this.alphabet = this.alphabeta.sort().join("");
		}

		/**
		 * Promise to load an edition
		 */
		static load(name) {
			if (editions[name])
				return Promise.resolve(editions[name]);

			// Use requirejs to support dependencies in the edition
			// files
			return new Promise(resolve => {
				requirejs([ `editions/${name}` ], data => {
					editions[name] = new Edition(data);
					editions[name].name = name;
					console.log(`Loaded edition ${name}`);
					resolve(editions[name]);
				});
			});
		}
		
		toString() {
			return this.name;
		}

		/**
		 * Get the letter indices for the letters in the given word
		 */
		getLetterIndices(word) {
			return word.split("")
			.map(l => this.alphabet.indexOf(l.toUpperCase()));
		}
		
		/**
		 * Get the score of a tile with the given letter
		 */
		letterScore(l) {
			return this.scores[l] ? this.scores[l] : 0;
		}
	}

	return Edition;
});
