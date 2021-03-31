/**
 * Python source: https://raw.githubusercontent.com/elijahsawyers/WordsWithFriendsHelper/master/src/best_game_move.py
 * Author: Elijah Sawyers
 * Emails: elijahsawyers@gmail.com
 * Date: 03/27/2020
 * Reference: Loosely based on https://www.cs.cmu.edu/afs/cs/academic/class/15451-s06/www/lectures/scrabble.pdf
 *
 * Translation to Javascript, fixes and integration
 * Author: Crawford Currie
 */

define("game/BestMove", ["game/Edition", "game/Dictionary"], (Edition, Dictionary) => {

	// Shortcuts to game information during move computation
	let rack;        // class Rack
	let board;       // class Board
	let edition;     // class Edition
	let dict;        // Class Dictionary
	
    let bestPlay;    // best play found so far
    let crossChecks; // checks for valid words on opposite axis
	let timeout;     // May abort due to timeoout
	
	/**
	 * An anchor is an empty cell with an adjacent (horizontal or
	 * vertical) non-empty cell. This returns a matrix the same size
	 * as the board with true for each valid anchor. If there are no
	 * anchors, indicating an empty game board, the centre square
	 * is set as the only anchor.
	 * 
	 * @param board the Board
	 * @return the column-major anchor matrix, or null if the centre
	 * square is the only valid anchor.
	 */
	function findAnchors(board) {
		let noAnchors = true
		const anchors = [];

		for (let col = 0; col < board.dim; col++) {
			const column = [];
			for (let row = 0; row < board.dim; row++) {
				if (board.squares[col][row].tile)
					column.push(false);

				else if (
					(col > 0 && board.squares[col - 1][row].tile)
					|| (col < (board.dim - 1) && board.squares[col + 1][row].tile)
					|| (row > 0 && board.squares[col][row - 1].tile)
					|| (row < (board.dim - 1) && board.squares[col][row + 1].tile)) {
					noAnchors = false;
					column.push(true);
					
				} else
					column.push(false);
			}
			anchors.push(column);
		}

		if (noAnchors)
			return null;

		return anchors;
	}

    // Removes a letter from the rack and returns it.
    // @param rack the rack of letters to filter.
    // @return the filtered rack.
    function filterRack(rack, letter) {
        let letterRemoved = false;
        const newRack = [];

        for (let currentLetter of rack) {
            // Same letter, hasn't been removed.
            if (currentLetter == letter && !letterRemoved)
                letterRemoved = true;
            // Different letter or letter already removed,
			// add it to the new rack.
            else
				newRack.push(currentLetter);
		}

        return newRack;
	}
	
	/**
	 * Return a list of the letters that are in both the rack and
	 * the letters array
	 * @param rack array of letters
	 * @param letters array of letters
	 * @return a list of letters
	 */
	function intersection(rack, letters) {
		if (rack.indexOf(' ') >= 0)
			return letters;
		const result = [];
		for (let letter of rack)
			if (letters.indexOf(letter) >= 0)
				result.push(letter);
		return result;
	}
	
	/**
	 * Determine which letters can fit in each square and form a valid
	 * horizontal or vertical cross word. This returns a matrix where
	 * each [col][row] square has two lists, one of valid vertical
	 * chars and another of valid horizontal chars. The [0] lists give
	 * the letters that are valid for forming a vertical cross word,
	 * and the [1] lists give the letters valid for creating a
	 * horizontal cross word.  The indices are chosen such that the
	 * cells can be indexed using the dcol parameter in the other
	 * functions.
	 * @param board the Board
	 * @return [c][r][2] the cross check letter matrix.
	 */
	function computeCrossChecks(board) {
		const xChecks = [];

		for (let col = 0; col < board.dim; col++) {
			const thisCol = [];
			xChecks.push(thisCol);
			
			for (let row = 0; row < board.dim; row++) {
				const thisCell = [[], []];
				thisCol[row] = thisCell;
				
				if (board.squares[col][row].tile) {
					// The cell isn't empty, only this letter is valid.
					// Note it can never be blank!
					thisCell[0].push(board.squares[col][row].tile.letter);
					thisCell[1].push(board.squares[col][row].tile.letter);
					continue;
				}

				// Find the known words above and below
				let wordAbove = '';
				let r = row - 1;
				while (r >= 0 && board.squares[col][r].tile) {
					wordAbove = board.squares[col][r].tile.letter + wordAbove;
					r--;
				}

				let wordBelow = '';
				r = row + 1;
				while (r < board.dim && board.squares[col][r].tile) {
					wordBelow += board.squares[col][r].tile.letter;
					r++;
				}

				// Find the known words left and right
				let wordLeft = '';
				let c = col - 1;
				while (c >= 0 && board.squares[c][row].tile) {
					wordLeft = board.squares[c][row].tile.letter + wordLeft;
					c--;
				}

				let wordRight = '';
				c = col + 1
				while (c != board.dim && board.squares[c][row].tile) {
					wordRight += board.squares[c][row].tile.letter;
					c++;
				}

				// Find which (if any) letters in the alphabet form a
				// valid cross word.
				for (let letter of edition.alphabeta) {
					if (wordAbove && wordBelow) {
						if (dict.hasWord(wordAbove + letter + wordBelow))
							thisCell[1].push(letter);
					} else if (wordAbove) {
						if (dict.hasWord(wordAbove + letter))
							thisCell[1].push(letter);
					} else if (wordBelow) {
						if (dict.hasWord(letter + wordBelow))
							thisCell[1].push(letter);
					} else
						thisCell[1].push(letter);
					
					if (wordLeft && wordRight) {
						if (dict.hasWord(wordLeft + letter + wordRight))
							thisCell[0].push(letter);
					} else if (wordLeft) {
						if (dict.hasWord(wordLeft + letter))
							thisCell[0].push(letter);
					} else if (wordRight) {
						if (dict.hasWord(letter + wordRight))
							thisCell[0].push(letter);
					} else
						thisCell[0].push(letter);
				}
			}
		}
		
		return xChecks;
	}

    /**
     * Given a word played at col, row, compute its score. Note that the
	 * "all tiles played" bonus is NOT applied here.
	 * 
	 * @param dcol, drow 1/0 depending if the word is played across
	 * or down
     * @param word the word to compute the score of.
     * @param col, row the coordinates of the LAST letter
     * of the word on the board.
     * @return {int} the score of the word.
     */
    function scoreWord(dcol, drow, word, col, row) {

		// Accumulator for word letter scores
		let wordScore = 0;

		// Accumulator for crossing words scores
		let crossWordsScore = 0;

		// Multipler for the vertical word
		let wordMultiplier = 1;

		// Work back from the last letter
        for (let lIndex = 0; lIndex < word.length; lIndex++) {
			const r = row - lIndex * drow;
			const c = col - lIndex * dcol;
			const letter = word[word.length - lIndex - 1];
			const square = board.squares[c][r];
            let letterScore = edition.letterValue(letter);		
			
			if (square.tileLocked) {
				wordScore += letterScore;
				continue; // pre-existing tile, no bonuses
			}

			// Letter is being placed, so letter multiplier applies to all
			// new words created, including cross words
			letterScore *= square.letterScoreMultiplier;

			wordScore += letterScore;
			
			// Multiplier for any new words that cross this letter
			let crossWordMultiplier = square.wordScoreMultiplier;
			wordMultiplier *= crossWordMultiplier;

			// This is a new tile, need to analyse cross words and
			// apply bonuses
			//let crossWord = ''; // debug
			let crossWordScore = 0;
				
			// Look left/up
            for (let cp = c - drow, rp = r - dcol;
				 cp >= 0 && rp >= 0 && board.squares[cp][rp].tile;
				 cp -= drow, rp -= dcol) {
                crossWordScore += board.squares[cp][rp].tile.score;
			}

			// Look right/down
            for (let cp = c + drow, rp = r + dcol;
				 cp < board.dim && rp < board.dim && board.squares[c][r].tile;
				 cp += drow, rp += dcol) {
                crossWordScore += board.squares[cp][rp].tile.score
			}
                
            if (crossWordScore > 0) {
				// This tile (and bonuses) contribute to cross words
					
                crossWordScore += letterScore;
				crossWordScore *= crossWordMultiplier;
				crossWordsScore += crossWordScore;
			}
		}
		
        wordScore *= wordMultiplier;
        
        // Add cross word values to the main word value
		wordScore += crossWordsScore;
		
        return wordScore;
	}

	function aborted() {
		return (Date.now() > timeout);
	}
	
	/**
     * Given an anchor position, recursively compute possible down
     * word plays by extending down the board. For each word,
     * compute its point value, and update the bestPlay score
     * accordingly.
	 * 
     * @param col, row index of the current position on the board.
     * @param {Array<str>} rack the user's letter rack.
     * @param {str} currentWord the current permutation of the word.
     * @param {Array<Array<int>>} rackPlayedIndices a list of the
	 * indices of letters played from the rack while extending down. 
     */
	function extend(dcol, drow, col, row, rack, currentWord, rackPlayedIndices) {

		if (row >= board.dim || col >= board.dim || aborted())
			return;

		// For the current square, find common letters between the
		// rack and cross checks
		let commonLetters = intersection(rack, crossChecks[col][row][dcol])
		//console.log(currentWord, "common letters", commonLetters);
		
        if (!board.squares[col][row].tile && commonLetters.length == 0)
			//  no tile and no useable letters in the rack
            return;
		
		// Determine if the next tile after the word is blank or off
		// the board - a precondition of the extended word being playable.
		let playable = (col + dcol == board.dim || row + drow == board.dim
						|| !board.squares[col + dcol][row + drow].tile);
		
        if (board.squares[col][row].tile) {
			// Occupied square
			let letter = board.squares[col][row].tile.letter;
            let word = currentWord + letter;
            if (playable && word.length > 1 && dict.hasWord(word)) {
				// New word is playable and is in the dictionary

                let score = scoreWord(dcol, drow, word, col, row);
					+ board.calculateBonus(rackPlayedIndices.length);
				
                if (score > bestPlay.score) {
                    bestPlay.start = [
						col - dcol * (word.length - 1),
						row - drow * (word.length - 1)
					];
                    bestPlay.word = word;
                    bestPlay.score = score;
					bestPlay.dcol = dcol;
					bestPlay.drow = drow;
					console.log(
						`Best ${drow > 0 ? 'down' : 'across'} extension ${word} ${score}`,
						rackPlayedIndices);
				} else
					console.log(`Reject ${drow > 0 ? 'down' : 'across'} ${word} ${score}`,
								rackPlayedIndices);
			}

            // Keep extending to form words
			extend(dcol, drow, col + dcol, row + drow,
				   rack, // not filtered, no tile placed
				   word, rackPlayedIndices);

			return;
		}

		// empty cell.
        for (let letter of commonLetters) {
			if (aborted())
				return;
			
            let word = currentWord + letter;

            if (playable && word.length > 1 && dict.hasWord(word)) {
				// New word is in the dictionary

				let rpi = rackPlayedIndices.concat([[col, row]]);
                let score = scoreWord(dcol, drow, word, col, row)
					+ board.calculateBonus(rpi.length);

                if (score > bestPlay.score) {
                    bestPlay.start = [
						col - dcol * (word.length - 1),
						row - drow * (word.length - 1)
					];
                    bestPlay.word = word;
                    bestPlay.score = score;
					bestPlay.dcol = dcol;
					bestPlay.drow = drow;
					console.log(
						`Best ${drow > 0 ? 'down' : 'across'} word ${word} ${score}`, rpi);
				}
				else
					console.log(`Reject ${word} ${score}`, rpi);
			}

			// Keep extending down to form words.
			extend(
				dcol, drow, col + dcol, row + drow,
				filterRack(rack, letter),
				currentWord + letter,
				rackPlayedIndices.concat([[col, row]])
			);
		}
	}

	/**
     * Given a position above/left of an anchor, recursively compute possible
     * word plays by extending up/right before extending down/left on the
     * board. For each word, compute its point value, and update the
     * bestPlay score accordingly.
	 * 
     * @param col, row the current position on the board.
     * @param {Array<str>} rack the user's letter rack.
     * @param {str} prior the current prior part of the word.
     */
    function extendWithPrior(dcol, drow, col, row, rack, prior) {

		if (row < 0 || col < 0)
			return; // out of bounds
		
        if ((dcol > 0 && col === 0) || (drow > 0 && row === 0)
			|| !board.squares[col - dcol][row - drow].tile) {

			// For the current coordinate, find common letters between
			// the rack and cross checks.
			const commonLetters =
				  intersection(rack, crossChecks[col][row][dcol]);

			// Base Case - no common letters
			if (commonLetters.length == 0)
				return;

            for (let letter of commonLetters) {
				if (aborted())
					return;
				
                const word = letter + prior;
                const rackPlayedIndices = [];

                for (let k = 0; k < word.length; k++)
					rackPlayedIndices.push([col + k * dcol, row + k * drow]);

                // Extend down/right to try to form words
                extend(dcol, drow,
					   col + dcol * word.length, row + drow * word.length,
                       filterRack(rack, letter),
                       word,
                       rackPlayedIndices);

                // Keep extending up/left
                extendWithPrior(
					dcol, drow,
					col - dcol, row - drow,
					filterRack(rack, letter),
					word
				);
			}
		}
	}

	/**
	 * Explore the words that can be formed around the given anchor
	 * on the given axis. Update bestPlay if a better word is found.
	 * @param dcol, drow 1/0 depending on whether we are looking vertically
	 * or horizontally
	 * @param col, row location of the anchor
	 */
	function exploreAnchor(dcol, drow, col, row) {

		if ((drow > 0 && row > 0 || dcol > 0 && col > 0)
			&& !board.squares[col - dcol][row - drow].tile) {
			// cell above/left of the anchor is empty, so it might be
			// a valid place to start a word

			extend(dcol, drow, col, row, rack, '', []);
			extendWithPrior(dcol, drow, col - dcol, row - drow, rack, '');
		}
		else {
			// cell above/left of the anchor is occupied or off the board

			let word = '';		
			let r = row - drow;
			let c = col - dcol;
			while (r >= 0 && c >= 0 && board.squares[c][r].tile) {
				word = board.squares[c][r].tile.letter + word;
				r -= drow;
				c -= dcol;
			}

			// Look down/right from the anchor.
			extend(dcol, drow, col, row, rack, word, []);
		}
	}

	/**
	 * Special case of the opening move. Find anagrams of the player's
	 * rack, and find the highest scoring position for each word.
	 * @return bestPlay
	 */
	function bestOpeningPlay() {
		const choices = dict.findAnagrams(rack.join(""));

		let bestPlay = {
			start: [-1, -1], // col, row
			dcol: 0,         // 1 if it's a column move, or
			drow: 0,         // 1 if it's a row move
			word: '',
			score: 0
		};
		
		for (let choice of Object.keys(choices)) {
			// We assume the board is diagonally symmetrical, and
			// we only have to test "across" constructions that can
			// then be rotated 90
			for (let end = board.middle;
				 end < board.middle + choice.length;
				 end++) {
				const score = scoreWord(1, 0, choice, end, board.middle);
				if (score > bestPlay.score) {
					const start = end - (choice.length - 1);
					if (Math.random() > 0.5) {
						bestPlay.start = [start, board.middle]
						bestPlay.dcol = 1;
						bestPlay.drow = 0;
					} else {
						bestPlay.start = [board.middle, start];
						bestPlay.dcol = 0;
						bestPlay.drow = 1;
					}
					bestPlay.word = choice;
					bestPlay.score = score;
					console.log("New best opening", bestPlay);
				}
			}
		}
		return bestPlay;
	}
	
	/*
	 * Given a user's letter rack, compute the best possible move.
	 * 
	 * @param rack rack in the form of a simple array of letters
	 * @param board the partially-complete Board
	 * @param e Edition
	 * @return Promise that resolves to data containing the best
	 * possible move information.
	 */
    function findBestMove(game, player) {		
		if (!game.edition) {
			console.log("Game has no edition", game);
			return Promise.reject('Game has no edition');
		}

		if (!game.dictionary) {
			console.log("Cannot find moves with no dictionary");
			return Promise.reject('Game has no dictionary');
		}

		return Edition.load(game.edition)
		.then(e => { edition = e; })
		.then(() => Dictionary.load(game.dictionary))
		.then(d => { dict = d; })
		.then(() => {
			// sort and reverse to make sure high value letters come
			// first and blanks come last. It's not going to make it
			// any faster, but it will abort with a better result if
			// it's going to time out.
			rack = player.rack.letters().sort().reverse();

			console.log("finding best move for rack ",rack);
			board = game.board;

			// Compute the anchors and cross checks.
			const anchors = findAnchors(board);

			if (anchors) {
				bestPlay = {
					start: [-1, -1], // col, row of the LAST letter
					dcol: 0,         // 1 if it's a column move, or
					drow: 0,         // 1 if it's a row move
					word: '',
					score: 0
				};

				crossChecks = computeCrossChecks(board);

				timeout = Date.now() + 10000;
				 
				for (let col = 0; col < board.dim && !aborted(); col++) {
					for (let row = 0; row < board.dim && !aborted(); row++) {
						if (anchors[col][row]) {
							// Valid anchor site
							exploreAnchor(1, 0, col, row);
							exploreAnchor(0, 1, col, row);
						}
					}
				}
			} else
				bestPlay = bestOpeningPlay();

			console.log(bestPlay);

			return bestPlay;
		});
	}
	
	return findBestMove;
});
