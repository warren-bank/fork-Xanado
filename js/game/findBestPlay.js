/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

/**
 * Calculate the best move in a Crossword game, given a dictionary,
 * a game edition, a current board state, and a player tile rack.
 * Based on https://raw.githubusercontent.com/elijahsawyers/WordsWithFriendsHelper/master/src/best_game_move.py by Elijah Sawyers<elijahsawyers@gmail.com>
 * In turn loosely based on https://www.cs.cmu.edu/afs/cs/academic/class/15451-s06/www/lectures/scrabble.pdf
 */
define("game/findBestPlay", ["game/Edition", "game/Dictionary"], (Edition, Dictionary) => {

	// Shortcuts to game information during move computation
	let rack;        // class Rack
	let board;       // class Board
	let edition;     // class Edition
	let dict;        // Class Dictionary
	
	let report;      // function to call when a new best play is found, or
	                 // print a progress message or error to the console.

    let bestScore;   // best score found so far
    let crossChecks; // checks for valid words on opposite axis
	
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
	function isAnchor(board, col, row) {
		if (board.squares[col][row].tile)
			return false;
		if (col > 0 && board.squares[col - 1][row].tile)
			return true;
		if (col < (board.dim - 1) && board.squares[col + 1][row].tile)
			return true;
		if (row > 0 && board.squares[col][row - 1].tile)
			return true;
		return row < (board.dim - 1) && board.squares[col][row + 1].tile;
	}
	
	// A start is any letter that has an adjacent blank space
	function isStart(board, col, row) {
		return board.squares[col][row].tile
		&& (
			(col > 0 && !board.squares[col - 1][row].tile)
			|| (col < (board.dim - 1) && !board.squares[col + 1][row].tile)
			|| (row > 0 && !board.squares[col][row - 1].tile)
			|| (row < (board.dim - 1) && !board.squares[col][row + 1].tile));
	}

	/**
	 * Removes a letter from the rack.
     * @param rack the array of letters representing the rack.
	 * @param letter the letter to remove. If the letter is not found
	 * explicitly in the rack, then the first ' ' (blank) will be filtered.
     * @return the filtered rack
	 * @throw if the letter (or a blank) wasn't found on the rack
	 */
function rackWithoutLetter(rack, letter) {
    let pos = rack.indexOf(letter);
	if (pos < 0)
		// Not found, try blank
		pos = rack.indexOf(' ');
	if (pos < 0) {
		console.log(`${letter} is not on rack and no blank`, rack);
		throw Error("Assert failed");
	}
	const newRack = rack.slice();
	newRack.splice(pos, 1);
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
	 * @param available the set of available letters
	 * @return [c][r][2] the cross check letter matrix.
	 */
	function computeCrossChecks(board, available) {
		const xChecks = [];
		
		for (let col = 0; col < board.dim; col++) {
			const thisCol = [];
			xChecks.push(thisCol);
			
			for (let row = 0; row < board.dim; row++) {
				const thisCell = [[], []];
				thisCol[row] = thisCell;
				
				if (board.squares[col][row].tile) {
					// The cell isn't empty, only this letter is valid.
					thisCell[0].push(board.squares[col][row].tile.letter);
					thisCell[1].push(board.squares[col][row].tile.letter);
					continue;
				}

				// Find the words above and below
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

				// Find the words left and right
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

				// Find which (if any) letters form a valid cross word
				for (let letter of available) {
					const h = wordLeft + letter + wordRight;
					
					// Is h a complete valid word, or just the letter
					// on its tod?
					const hIsWord = h.length === 1 || dict.hasWord(h);
					// Is h a valid complete word, or a legal sub-sequence?
					const hIsSeq = hIsWord || col > 0 && dict.hasSequence(h);

					const v = wordAbove + letter + wordBelow;
					const vIsWord = v.length === 1 || dict.hasWord(v);
					const vIsSeq = vIsWord || row > 0 && dict.hasSequence(v);
					
					if (hIsWord && vIsSeq)
						// A down word is playable with this letter, and
						// there's a valid down sequence involving the
						// letter
						thisCell[0].push(letter);

					if (vIsWord && hIsSeq)
						// An across word is playable with this letter, and
						// there's a valid across sequence involving the
						// letter
						thisCell[1].push(letter);
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

	/**
     * Given an anchor position, recursively compute possible down
     * word plays by extending down the board. For each word,
     * compute its point value, and update the best score
     * accordingly.
	 * 
     * @param col, row index of the current position on the board.
     * @param {Array<str>} rack the user's letter rack.
     * @param {str} currentWord the current permutation of the word.
     * @param {Array<Array<int>>} rackPlayedIndices a list of the
	 * indices of letters played from the rack while extending down. 
     */
	function extend(dcol, drow, col, row, rack, currentWord, rackPlayedIndices) {

		if (row >= board.dim || col >= board.dim)
			return;
		
		// Determine if the next tile after the word is blank or off
		// the board - a precondition of the extended word being playable.
		let playable = (col + dcol == board.dim || row + drow == board.dim
						|| !board.squares[col + dcol][row + drow].tile);
		
        if (board.squares[col][row].tile) {
			// Occupied square
			const letter = board.squares[col][row].tile.letter;
            const word = currentWord + letter;
			const match = dict.match(word);

			if (!match)
				return;
			
            if (playable && word.length > 1 && match.isEndOfWord) {
				// New word is playable and is in the dictionary

                const score = scoreWord(dcol, drow, word, col, row);
				+ (board.bonuses[rackPlayedIndices.length] || 0);
				
				report(`Consider '${word}' ${score}`);
                if (score > bestScore) {
					bestScore = score;
                    report({
						start: [
							col - dcol * (word.length - 1),
							row - drow * (word.length - 1)
						],
						word: word,
						score: score,
						dcol: dcol,
						drow: drow
					});
				}
				else
					report(`Reject '${word}' ${score}`, rackPlayedIndices);
			}

            // Keep extending to form longer words
			extend(dcol, drow, col + dcol, row + drow,
				   rack, // not filtered, no tile placed
				   word, rackPlayedIndices);

			return;
		}

		// For the current (empty) square, find common letters between
		// the rack and cross checks, filtering letters that don't
		// form a valid word extension
		const available = (
			(rack.indexOf(' ') >= 0)
			? crossChecks[col][row][dcol]
			: intersection(rack, crossChecks[col][row][dcol]))
			.filter(l => dict.match(currentWord + l));
		
        if (!board.squares[col][row].tile && available.length == 0)
			// no tile and no useable letters in the rack
            return;
		
		//report(`E ${currentWord}+'${available.join("")}'`);

		// empty cell.
        for (let letter of available) {
            const word = currentWord + letter;

            if (playable && word.length > 1 && dict.hasWord(word)) {
				// New word is in the dictionary

				let rpi = rackPlayedIndices.concat([[col, row]]);
                let score = scoreWord(dcol, drow, word, col, row)
					+ (board.bonuses[rpi.length] || 0);

				report(`Consider '${word}' ${score}`);
                if (score > bestScore) {
					bestScore = score;
                    report({
						start: [
							col - dcol * (word.length - 1),
							row - drow * (word.length - 1)
						],
						word: word,
						score: score,
						dcol: dcol,
						drow: drow
					});
				}
				else
					report(`Reject '${word}' ${score}`, rpi);
			}

			// Keep extending down to form words.
			extend(
				dcol, drow, col + dcol, row + drow,
				rackWithoutLetter(rack, letter),
				word,
				rackPlayedIndices.concat([[col, row]])
			);
		}
	}

	/**
     * Given a position above/left of an anchor, recursively compute possible
     * word plays by extending up/right before extending down/left on the
     * board. For each word, compute its point value, and update the
     * best score accordingly.
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

			// For the current square, find common letters between
			// the rack and cross checks. If we have a blank, then
			// add any of the crossChecks that don't appear on the
			// rack.
			const available =
				rack.indexOf(' ') >= 0
				? crossChecks[col][row][dcol]
				: intersection(rack, crossChecks[col][row][dcol])
			
			// Base Case - no common letters
			if (available.length == 0)
				return;

			let root = dict.root.match(prior);
			
			//console.log(`EWP ${prior}-'${rack.join("")}' '${available.join('')}'`);
			const rackPlayedIndices = [];
			for (let k = 0; k < prior.length + 1; k++)
				rackPlayedIndices.push(
					[col + k * dcol, row + k * drow]);

            for (let letter of available) {
                const seq = letter + prior;
				if (dict.hasSequence(seq)) {

					const shrunkRack = rackWithoutLetter(rack, letter);
					
					// Extend down/right to try to form words, but only if
					// the sequence can root a word.
					if (dict.match(seq)) {
						extend(dcol, drow,
							   col + dcol * seq.length, row + drow * seq.length,
							   shrunkRack,
							   seq,
							   rackPlayedIndices);
					}

					// Keep extending up/left with the reduced rack
					extendWithPrior(
						dcol, drow,
						col - dcol, row - drow,
						shrunkRack,
						seq
					);
				}
			}
		}
	}

	/**
	 * Explore the words that can be formed around the given anchor
	 * on the given axis. Update best score if a better word is found.
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
	 * rack, and find the highest scoring position for each possible word.
	 */
	function bestOpeningPlay() {
		const choices = dict.findAnagrams(rack.join(""));

		for (let choice of Object.keys(choices)) {
			// We assume the board is diagonally symmetrical, and
			// we only have to test "across" constructions that can
			// then be rotated 90
			for (let end = board.middle;
				 end < board.middle + choice.length;
				 end++) {
				const score = scoreWord(1, 0, choice, end, board.middle);
				if (score > bestScore) {
					bestScore = score;
					let bestPlay = {
						word: choice,
						score: score
					};
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
					report(bestPlay);
				}
			}
		}
	}

	/*
	 * Given a user's letter rack, compute the best possible move.
	 * @pram game the Game
	 * @param prack rack in the form of a simple array of letters
	 * @param listener fn() that accepts a best play whenever a new
	 * one is found, or a string containing a message
	 * @return Promise that resolves when all best moves have been identified
	 */
    function findBestPlay(game, prack, listener) {
		report = listener;
		
		if (!game.edition) {
			report("Error: Game has no edition", game);
			return Promise.reject('Game has no edition');
		}

		if (!game.dictionary) {
			report("Error: Cannot find moves with no dictionary");
			return Promise.reject('Game has no dictionary');
		}

		// sort and reverse to make sure high value letters come
		// first and blanks come last. It's not going to make it
		// any faster, but it will abort with a better result if
		// it's going to time out.
		rack = prack.sort().reverse();

		report("Finding best play for rack " + rack);

		board = game.board;
		report("on board" + board );

		const preamble = [
			Dictionary.load(game.dictionary),
			Edition.load(game.edition)
		];

		return Promise.all(preamble)
		.then(de => {
			dict = de[0];
			edition = de[1];
			
			report("Starting computation");
			bestScore = 0;

			// Compute the anchors and cross checks.
			let anchored = false;
			// What letters can be used to form a valid cross
			// word? The whole alphabet if the rack contains a
			// blank, the rack otherwise.
			const available = rack.indexOf(' ') >= 0
				  ? edition.alphabeta : rack;
			crossChecks = computeCrossChecks(board, available);
			for (let col = 0; col < board.dim; col++) {
				for (let row = 0; row < board.dim; row++) {
					if (isAnchor(board, col, row)) {
						anchored = true;
						// Explore anchor locations exhaustively. Might be able
						// to do this more efficiently e.g. explore anchors that
						// have bonuses first, but it's fast enough not to have
						// to bother (though super scrabble with a blank near
						// the end of a game is going to explore a LOT of
						// alternatives!)
						report(`Explore ${col},${row} across`);
						exploreAnchor(1, 0, col, row);
						report(`Explore ${col},${row} down`);
						exploreAnchor(0, 1, col, row);
					}
				}
			}

			if (!anchored)
				// No anchors, so this is an opening play.
				bestOpeningPlay();

		});
	}
	
	return findBestPlay;
});
