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
	let rack;     // class Rack
	let board;    // class Board
	let edition;  // class Edition
    let bestWord;
    let anchors, crossChecks;

	/**
	 * An anchor is an empty cell with an adjacent (horizontal or
	 * vertical) non-empty cell. This returns a matrix the same size
	 * as the board with true for each valid anchor. If there are no
	 * anchors, indicating an empty game board, the centre square
	 * is set as the only anchor.
	 * 
	 * @param board the Board
	 * @return {Array<Array<Boolean>>} the column-major anchor matrix.
	 */
	function findAnchors(board) {
		let noAnchors = true
		let anchors = [];

		for (let col = 0; col < board.dim; col++) {
			let column = [];
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
			anchors[board.middle][board.middle] = true;

		return anchors;
	}

    // Removes a letter from the rack and returns it.
    // @param {Array<str>} rack the rack of letters to filter.
    // @return {Arrary<str>} the filtered rack.
    function filterRack(rack, letter) {
        let letterRemoved = false;
        let newRack = [];

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
		let result = [];

		for (let letter of rack)
			if (letters.indexOf(letter) >= 0)
				result.push(letter);
		return result;
	}
	
	/**
	 * Determine which letters can fit in each cell of a row and form
	 * a valid cross word. This returns a square matrix where each [col][row]
	 * has two arrays, one of valid vertical chars and another of valid
	 * horizontal chars. The 'h' lists give the letters that are
	 * valid for forming a vertical cross word, and the 'v' lists
	 * give the letters valid for creating a horizontal cross word.
	 * @param board the Board
	 * @return [c][r]{h:[],v:[]} the cross check letter matrix.
	 */
	function computeCrossChecks(board) {
		let cols = [];

		for (let col = 0; col < board.dim; col++) {
			let thisCol = [];
			cols.push(thisCol);
			
			for (let row = 0; row < board.dim; row++) {
				let thisCell = { h: [], v: [] };
				thisCol[row] = thisCell;
				
				if (board.squares[col][row].tile) {
					// The cell isn't empty, only this letter is valid
					thisCell.h.push(board.squares[col][row].tile.letter);
					thisCell.v.push(board.squares[col][row].tile.letter);
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
							thisCell.h.push(letter);
					} else if (wordAbove) {
						if (dict.hasWord(wordAbove + letter))
							thisCell.h.push(letter);
					} else if (wordBelow) {
						if (dict.hasWord(letter + wordBelow))
							thisCell.h.push(letter);
					} else
						thisCell.h.push(letter);
					
					if (wordLeft && wordRight) {
						if (dict.hasWord(wordLeft + letter + wordRight))
							thisCell.v.push(letter);
					} else if (wordLeft) {
						if (dict.hasWord(wordLeft + letter))
							thisCell.v.push(letter);
					} else if (wordRight) {
						if (dict.hasWord(letter + wordRight))
							thisCell.v.push(letter);
					} else
						thisCell.v.push(letter);
				}
			}
		}
		
		return cols;
	}

    /**
     * Given a word played at col, row, compute its score.
	 * 
	 * @param axis 'h' or 'v' depending if the word is played across
	 * or down
     * @param word the word to compute the score of.
     * @param col, row the coordinates of the LAST letter
     * of the word on the board.
     * @return {int} the score of the word.
     */
    function scoreWord(axis, word, col, row) {
		let drow = axis === 'h' ? 0 : 1;
		let dcol = axis === 'h' ? 1 : 0;

		// Accumulator for word letter scores
		let wordScore = 0;

		// Accumulator for crossing words scores
		let crossWordsScore = 0;

		// Multipler for the vertical word
		let wordMultiplier = 1;

		let debug = false;//(word=="LURS");
		
		// Work back from the last letter
        for (let lIndex = 0; lIndex < word.length; lIndex++) {
			let r = row - lIndex * drow;
			let c = col - lIndex * dcol;
			let letter = word[word.length - lIndex - 1];
            let letterScore = edition.letterValue(letter);		
			let square = board.squares[c][r];
			
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

			if (debug && square.wordScoreMultiplier != 1)
				console.log(`${col},${r} *${square.wordScoreMultiplier}`);

			// This is a new tile, need to analyse cross words and
			// apply bonuses
			let crossWord = ''; // debug
			let crossWordScore = 0;
				
			// Look left/up
            for (let cp = c - drow, rp = r - dcol;
				 cp >= 0 && rp >= 0 && board.squares[cp][rp].tile;
				 cp -= drow, rp -= dcol) {
                crossWordScore += board.squares[cp][rp].tile.score;
				if (debug)
					crossWord = board.squares[cp][rp].tile.letter + crossWord;
			}

			if (debug)
				crossWord += letter;
				
			// Look right/down
            for (let cp = c + drow, rp = r + dcol;
				 cp < board.dim && rp < board.dim && board.squares[c][r].tile;
				 cp += drow, rp += dcol) {
                crossWordScore += board.squares[cp][rp].tile.score
				if (debug)
					crossWord = crossWord + board.squares[cp][rp].tile.letter;
			}
                
            if (crossWordScore > 0) {
				// This tile (and bonuses) contribute to cross words
					
                crossWordScore += letterScore;

				if (debug)
					console.log(`+ ${crossWord} ${crossWordScore}*${crossWordMultiplier}`);
	
				crossWordScore *= crossWordMultiplier;
				crossWordsScore += crossWordScore;
			}
		}
		
        wordScore *= wordMultiplier;
		if (debug)
			console.log(`${word}*${wordMultiplier}->${wordScore}`);
        
        // Add cross word values to the main word value
		wordScore += crossWordsScore;
		
		if (debug)
			console.log(`${word}+cross->${wordScore}`);

        return wordScore;
	}

	/**
     * Given an anchor position, recursively compute possible down
     * word plays by extending down the board. For each word,
     * compute its point value, and update the bestWord score
     * accordingly.
	 * 
     * @param col, row index of the current position on the board.
     * @param {Array<str>} rack the user's letter rack.
     * @param {str} currentWord the current permutation of the word.
     * @param {Array<Array<int>>} rackPlayedIndices a list of the
	 * indices of letters played
     * from the rack while extending down. 
     */
	function extend(axis, col, row, rack, currentWord, rackPlayedIndices) {

		if (row >= board.dim || col >= board.dim)
			return;

		let drow = axis === 'h' ? 0 : 1;
		let dcol = axis === 'v' ? 0 : 1;
		
		// For the current coordinate, find common letters between the
		// rack and cross checks.
		let commonLetters = intersection(rack, crossChecks[col][row][axis])
		
        if (!board.squares[col][row].tile && commonLetters.length == 0)
			//  no tile and no useable letters in the rack
            return;

		//console.log(`Extend ${axis} '${currentWord}' ${col},${row} rack `, rack);

		// Determine if the next tile after the word is blank or off
		// the board - a precondition of the word being playable.
		if (!(col + dcol == board.dim || row + drow == board.dim
			  || !board.squares[col + dcol][row + drow].tile)) {
			return;
		}
		
        if (board.squares[col][row].tile) {
			// Occupied square
			let letter = board.squares[col][row].tile.letter;
            let word = currentWord + letter;
            if (word.length > 1 && dict.hasWord(word)) {				
				// New word is in the dictionary

                let score = scoreWord(axis, word, col, row);
				
				// If the full rack is played, add bonus
				if (rackPlayedIndices.length == board.rackCount)
					score += board.allPlacedBonus;

                if (score > bestWord.score) {
                    bestWord.start = [
						col - dcol * (word.length - 1),
						row - drow * (word.length - 1)
					];
                    bestWord.word = word;
                    bestWord.score = score;
					bestWord.axis = axis;
					console.log(
						`Best ${axis} extension ${word} ${score}`,
						rackPlayedIndices);
				} else {
					console.log(
						`Reject ${axis} extension ${word} ${score}`,
						rackPlayedIndices);
				}
			}

            // Keep extending to form words
            extend(
				axis, col + dcol, row + drow,
                rack, // not filtered, no tile placed
                currentWord + board.squares[col][row].tile.letter,
                rackPlayedIndices
			);

			return;
		}

		// empty cell.
        for (let letter of commonLetters) {
            let word = currentWord + letter;
            if (word.length > 1 && dict.hasWord(word)) {
				// New word is in the dictionary

				let rpi = rackPlayedIndices.concat([[col, row]]);
                let score = scoreWord(axis, word, col, row);

				// If the full rack is played, add bonus
				if (rpi.length == board.rackCount)
					score += board.allPlacedBonus;

                if (score > bestWord.score) {
                    bestWord.start = [
						col - dcol * (word.length - 1),
						row - drow * (word.length - 1)
					];
                    bestWord.word = word;
                    bestWord.score = score;
					bestWord.axis = axis;
					console.log(
						`Best ${axis} word ${word} ${score}`, rpi);
				}
				else {
					console.log(
						`Reject ${axis} word ${word} ${score}`,
						rpi);
				}
			}
                
			// Keep extending down to form words.
			extend(
				axis, col + dcol, row + drow,
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
     * bestWord score accordingly.
	 * 
     * @param col, row the current position on the board.
     * @param {Array<str>} rack the user's letter rack.
     * @param {str} topPart the current topPart of the word.
     */
    function extendWithPrior(axis, col, row, rack, topPart) {

		if (row < 0 || col < 0)
			return; // out of bounds
		
        // For the current coordinate, find common letters between
		// the rack and cross checks.
		let commonLetters = intersection(rack,	crossChecks[col][row][axis]);

		let drow = axis === 'v' ? 1 : 0;
		let dcol = axis === 'h' ? 1 : 0;

        // Base Case - no common letters
        if (commonLetters.length == 0)
            return;

        if ((axis === 'h' && col === 0) || (axis === 'v' && row === 0)
			|| !board.squares[col - dcol][row - drow].tile) {

            for (let letter of commonLetters) {
                let word = letter + topPart;
                let rackPlayedIndices = [];

                for (let k = 0; k < word.length; k++)
					rackPlayedIndices.push([col + k * dcol, row + k * drow]);

                // Extend down/right to form words.
                extend(
					axis, col + dcol * word.length, row + drow * word.length,
                    filterRack(rack, letter),
                    word,
                    rackPlayedIndices
				);

                // Keep extending up/left
                extendWithPrior(
					axis,
					col - dcol, row - drow,
					filterRack(rack, letter),
					word
				);
			}
		}
	}
	
	/*
	 * Given a user's letter rack, compute the best possible move.
	 * 
	 * @param rack rack in the form of a simple array of letters
	 * @param board the partially-complete Board
	 * @param e Edition
	 * @return data containing the best possible move information.
	 */
	async function findBestMove(game, player) {		
		if (!game.edition)
			console.log("Game has no edition", game);
		await Edition.load(game.edition)
		.then(e => { edition = e; });
		
		if (!game.dictionary)
			throw Error("Cannot find moves with no dictionary");
		
		await Dictionary.load(game.dictionary)
		.then(d => { dict = d; });

		rack = player.rack.letters();
		console.log("finding best move for rack ",rack);
		board = game.board;

		// Compute the anchors and cross checks.
		anchors = findAnchors(board);

		crossChecks = computeCrossChecks(board);

		bestWord = {
			start: [-1, -1],
			axis: '?',
			word: '',
			score: 0
		};

		for (let col = 0; col < board.dim; col++) {
			for (let row = 0; row < board.dim; row++) {
				if (anchors[col][row]) {
					// Valid anchor site

					//console.log(`anchor @ ${col},${row} v`);
					
					// Find down words
					if (row > 0 && !board.squares[col][row - 1].tile) {
						// cell above the anchor is empty
						extend(
							'v', col, row,
							rack,
							'',
							[]
						);

						extendWithPrior(
							'v', col, row - 1,
							rack,
							''
						);
					}
					// cell above the anchor is occupied.
					else {
						// Grab the word above the anchor, if there is one.
						let word = '';
						let k = row - 1;
						while (k >= 0 && board.squares[col][k].tile) {
							word = board.squares[col][k].tile.letter + word;
							k--;
						}

						// Look down from the anchor.
						extend(
							'v', col, row,
							rack,
							word,
							[]
						);
					}

					//console.log(`anchor @ ${col},${row} h`);

					// Find across words
					if (col > 0 && !board.squares[col - 1][row].tile) {
						extend(
							'h', col, row,
							rack,
							'',
							[]
						);
						extendWithPrior(
							'h', col - 1, row,
							rack,
							''
						);
					}
					// Case 2: cell to the left of the anchor is occupied.
					else {
						// Grab the word to the left of the anchor, if there is one.
						let word = '';
						let k = col - 1;
						while (k >= 0 && board.squares[k][row].tile) {
							word = board.squares[k][row] + word;
							k -= 1;
						}
						
						// Compute possible words extending right of the anchor.
						extend(
							'h',
							col, row,
							rack,
							word,
							[]
						);
					}

				}
			}
		}
		console.log(bestWord);

		return bestWord;
	}

	return findBestMove;
});
