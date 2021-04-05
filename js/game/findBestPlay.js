/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

/**
 * Calculate the best move in a Crossword game, given a dictionary,
 * a game edition, a current board state, and a player tile rack.
 * Based on https://raw.githubusercontent.com/elijahsawyers/WordsWithFriendsHelper/master/src/best_game_move.py by Elijah Sawyers<elijahsawyers@gmail.com>
 * In turn loosely based on https://www.cs.cmu.edu/afs/cs/academic/class/15451-s06/www/lectures/scrabble.pdf
 * javascript version, and rewrite for Dictionary integration, Crawford Currie.
 */
define("game/findBestPlay", ["game/Edition", "dawg/Dictionary"], (Edition, Dictionary) => {

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
	 * Determine if the square is on the board and available for
	 * placing a tile
	 */
	function isEmpty(col, row) {
		if (col < 0 || row < 0
			|| col >= board.dim || row >= board.dim)
			return false;
		return !board.squares[col][row].tile;
	}
	
	/**
	 * An anchor is a square with a tile, that has an adjacent
	 * (horizontal or vertical) non-empty square.
	 * @param board the Board
	 * @return true if this cell is a valid anchor
	 */
	function isAnchor(col, row) {
		return !isEmpty(col, row)
		&& (isEmpty(col - 1, row)
			|| isEmpty(col + 1, row)
			|| isEmpty(col, row - 1)
			|| isEmpty(col, row + 1));
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
	 * Determine if a play can be completed, but only by using a blank.
	 * Does not check if the rack contains a blank.
	 */
	function needBlank(rack, letter) {
		if (rack.indexOf(letter) < 0)
			return true;
	}
	
	/**
	 * Return a list of the letters that are in both arrays
	 * @param a array of letters
	 * @param b array of letters
	 * @return intersection of a and b
	 */
	function intersection(a, b) {
		return a.filter(l => b.indexOf(l) >= 0);
	}

	/**
	 * For debug, return a pair of strings
	 */
	function pack(letters) {
		return [ `'${letters.map(l => l.letter).join("")}'`,
				 `'${letters.map(l => l.isBlank ? ' ' : l.letter).join("")}'` ];
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
     * @param col, row the coordinates of the LAST letter
	 * @param dcol, drow 1/0 depending if the word is played across
	 * or down
     * @param word a list of { letter:, isBlank: } tuples or Tile
     * of the word on the board.
     * @return {int} the score of the word.
     */
    function scoreWord(col, row, dcol, drow, word) {

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
			const letter = word[word.length - lIndex - 1].letter;
			const isBlank = word[word.length - lIndex - 1].isBlank;
			const square = board.squares[c][r];
            let letterScore = edition.letterValue(isBlank ? ' ' : letter);		
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
     * Given a position that can have a letter, recursively compute possible
     * word plays by extending down/across the board. For each word,
     * compute its point value, and update the best score
     * accordingly.
	 * 
     * @param col, row index of the current position on the board.
     * @param dcol, drow the extension direction (only one will be 1)
     * @param rack the user's letter rack.
	 * @param rackPlayed number of tiles from the rack already played
	 * @param dNode the current LetterNode
	 * @param letters the known letters terminating at the dNode. Each
	 * letter is a tuple { letter:, isBlank: } or a Tile
     */
	function extend(col, row,
					dcol, drow,
					rack, rackPlayed,
					dNode,
					letters) {

		//console.log(`Extend ${pack(letters)} ${col} ${row} ${dNode.letter} ${dNode.postLetters.join("")}`);

		// Tail recurse; report words as soon as we find them
		// Are we sitting at the end of a scoring word?
		if (dNode.isEndOfWord
			&& letters.length >= 2
			&& rackPlayed > 0
			&& (col + dcol == board.dim	|| row + drow == board.dim
				|| isEmpty(col + dcol, row + drow))) {
			const score = scoreWord(col, row, dcol, drow, letters);
			+ (board.bonuses[rackPlayed] || 0);
				
            if (score > bestScore) {
				report(`Accept '${pack(letters)}' at ${col},${row} ${score}`);
				bestScore = score;
                report({
					start: [
						col - dcol * (letters.length - 1),
						row - drow * (letters.length - 1)
					],
					word: letters.map(l => l.letter).join(''),
					score: score,
					dcol: dcol,
					drow: drow
				});
			}
			//else
			//	report(`Reject '${pack(letters)}' at ${col},${row} ${score}`);
		}

		let available;
		let playedFromRack = rackPlayed;
		
		// Do we have an empty cell we can extend into?
		if (isEmpty(col + dcol, row + drow)) {
			const haveBlank = (rack.indexOf(' ') >= 0);
			const xc = crossChecks[col + dcol][row + drow][dcol];
			
			available = intersection(
				dNode.postLetters,
				haveBlank ? xc : intersection(rack, xc));
			playedFromRack++;
			
		} else if (col + dcol < board.dim && row + drow < board.dim)
			// Have pre-placed tile
			available = [ board.squares[col + dcol][row + drow].tile.letter ];
			
		else
			available = [];

		for (let letter of available) {
			let shrunkRack, newLetters = letters.slice();
			if (playedFromRack > rackPlayed) {
				shrunkRack = rackWithoutLetter(rack, letter);
				newLetters.push(
					{ letter: letter, isBlank: needBlank(rack, letter) });
			} else {
				shrunkRack = rack;
				newLetters.push({ letter: letter });
			}

			for (let post of dNode.post) {
				if (post.letter === letter) {
					extend(col + dcol, row + drow,
						   dcol, drow,
						   shrunkRack, playedFromRack,
						   post,
						   newLetters);
				}
			}
		}
	}

	/**
     * Given a position that may be part of a word, and the letters of
	 * the word it may be part of, try to back up/left before extending
	 * down/right.
	 * 
     * @param col, row the current position on the board
     * @param dcol, drow the extension direction (only one will be 1)
     * @param rack remaining letters from the user's letter rack, array of char
	 * @param rackPlayed number of tiles from the rack already played
	 * @param anchorNode the DictNode where we started backing up
	 * @param dNode the current dictionary node
     * @param letters the letters found as part of the word. Each
	 * letter is a tuple { letter:, isBlank: } or a Tile
     */
    function explore(col, row,
					dcol, drow,
					rack, rackPlayed,
					anchorNode, dNode,
					letters) {

		let available; // the set of possible candidate letters
		let playedFromRack = rackPlayed;

		//console.log(`Explore ${pack(letters)} ${col} ${row} ${dNode.letter} ${dNode.preLetters.join("")}`);
		
		// Do we have an adjacent empty cell we can back up into?
        if (isEmpty(col - dcol, row - drow)) {
			// Find common letters between the rack, cross checks, and
			// dNode pre.
			const haveBlank = rack.indexOf(' ') >= 0;
			const xc = crossChecks[col - dcol][row - drow][dcol];
			
			available =
				  intersection(
					  dNode.preLetters,
					  haveBlank ? xc : intersection(rack, xc));
			playedFromRack++;
			
		} else if (row - drow >= 0 && col - dcol >= 0)
			// Non-empty square, might be able to walk back through it
			available = [ board.squares[col - dcol][row - drow].tile.letter ];
			
		else
			available = [];

		// Head recurse; longer words are more likely to
		// be high scoring, so want to find them first
		for (let letter of available) {
			let shrunkRack, newLetters = letters.slice();
			if (playedFromRack > rackPlayed) {
				shrunkRack = rackWithoutLetter(rack, letter);
				newLetters.unshift(
					{ letter: letter, isBlank: needBlank(rack, letter) });
			} else {
				shrunkRack = rack;
				newLetters.unshift({ letter: letter });
			}

			for (let pre of dNode.pre) {
				if (pre.letter === letter) {
					explore(col - dcol, row - drow,
						   dcol, drow,
						   shrunkRack, playedFromRack,
						   anchorNode, pre,
						   newLetters);
				}
			}
		}
		
		// If this is the start of a word in the dictionary, and
		// we're at the edge of the board or the prior cell is
		// empty, then we have a valid word start.
		if (dNode.pre.length == 0
			&& (row - drow < 0 || col - dcol < 0
				|| isEmpty(col - dcol, row - drow))) {
			
			// try extending down beyond the anchor, with the letters
			// that we have determined comprise a valid rooted sequence.
			extend(col + dcol * (letters.length - 1),
				   row + drow * (letters.length - 1),
				   dcol, drow,
				   rack, rackPlayed,
				   anchorNode,
				   letters);
		}
	}

	/**
	 * Special case of the opening move. Find anagrams of the player's
	 * rack, and find the highest scoring position for each possible word.
	 */
	function bestOpeningPlay() {
		const choices = dict.findAnagrams(rack.join(""));
		const drow = (Math.random() > 0.5) ? 1 : 0;
		const dcol = (drow + 1) % 2;
		
		for (let choice of Object.keys(choices)) {
			// Keep track of the rack
			let letters = [];
			let shrunkRack = rack;
			let blankedWord = '';
			for (let c of choice.split("")) {
				const l = { letter: c };
				if (needBlank(shrunkRack, c)) {
					l.isBlank = true;
					blankedWord += ' ';
				} else
					blankedWord += c;
				letters.push(l);
				shrunkRack = rackWithoutLetter(shrunkRack, c);
			}
			
			// We assume the board is diagonally symmetrical, and
			// we only have to test "across" constructions that can
			// then be rotated 90
			for (let end = board.middle;
				 end < board.middle + choice.length;
				 end++) {
				
				const score = scoreWord(end, board.middle, 1, 0, letters);
				if (score > bestScore) {
					bestScore = score;
					const start = end - (choice.length - 1);
					const bestPlay = {
						start: dcol
						? [start, board.middle]
						: [board.middle, start],
						word: choice,
						blankedWord: blankedWord,
						score: score,
						dcol: dcol,
						drow: drow
					};
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

			// Has at least one anchor been explored? If there are
			// no anchors, we need to compute an opening play
			let anchored = false;
			for (let col = 0; col < board.dim; col++) {
				for (let row = 0; row < board.dim; row++) {
					// An anchor is any square that has a tile and has an
					// adjacent blank that can be extended into to form a word
					if (isAnchor(col, row)) {
						if (!anchored) {
							// What letters can be used to form a valid cross
							// word? The whole alphabet if the rack contains a
							// blank, the rack otherwise.
							const available = rack.indexOf(' ') >= 0
								  ? edition.alphabeta : rack;
							crossChecks = computeCrossChecks(board, available);
							anchored = true;
						}
						const anchorTile = board.squares[col][row].tile;
						const roots = dict.getSequenceRoots(anchorTile.letter);
						for (let anchorNode of roots) {
							// Try and back up then forward through
							// the dictionary to find longer sequences
							explore(
								col, row,
								0, 1,
								rack, 0,
								anchorNode, anchorNode,
								[ anchorTile ]);
							explore(
								col, row,
								1, 0,
								rack, 0,
								anchorNode, anchorNode,
								[ anchorTile ])
						}
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
