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

	// Shared information during move computation
	let rack, board, edition, dict;
    let best_down_word, best_across_word;
    let anchors;
    let across_cross_checks;
    let down_cross_checks;
	
	function goodWord(word) {
		return dict.hasWord(edition.getLetterIndices(word));
	}

	/**
	 * Determine which letters can fit in each cell of a row and form
	 * a valid down word. This returns the letter matrix for each row
	 * as to which characters are valid for each cell.
	 * @param board the Board
	 * @return {Array<Array<str>>} the cross check letter matrix.
	 */
	function acrossCrosschecks(board) {

		let cross_checks = [];

		for (let row = 0; row < board.dim; row++) {
			let row_cross_checks = [];

			for (let col = 0; col < board.dim; col++) {
				row_cross_checks[col] = [];
				if (board.squares[col][row].tile) {
					// The cell isn't empty
					row_cross_checks[col].push(board.squares[col][row].tile.letter);
					continue;
				}

				// Find the words above and below (if applicable).
				let word_above = '';
				let j = row - 1;
				while (j >= 0 && board.squares[col][j].tile) {
					word_above = board.squares[col][j].tile.letter + word_above;
					j--;
				}

				let word_below = '';
				j = row + 1;
				while (j < board.dim && board.squares[col][j].tile) {
					word_below += board.squares[col][j].tile.letter;
					j++;
				}

				// Find which (if any) letters in the alphabet form a
				// valid cross word.
				for (let letter of edition.alphabeta) {
					if (word_above && word_below) {
						if (goodWord(word_above + letter + word_below))
							row_cross_checks[col].push(letter);
					} else if (word_above && word_below) {
						if (goodWord(word_above + letter))
							row_cross_checks[col].push(letter);
					} else if (word_below) {
						if (goodWord(letter + word_below)) {
							row_cross_checks[col].push(letter);
						}
					} else
						row_cross_checks[col].push(letter);
				}
			}
			cross_checks.push(row_cross_checks);
		}
		
		return cross_checks;
	}

	/**
	 * Move generation
	 * Determine which letters can fit in each cell of a column and
	 * form a valid across word. This returns the letter matrix for
	 * each column as to which characters are valid for each cell.
	 * @param board the Board
	 * @return {Array<Array<str>>} the cross check letter matrix.
	 */
	function downCrosschecks(board) {

		let cross_checks = [];

		for (let col = 0; col < board.dim; col++) {
			let column_cross_checks = [];

			for (let row = 0; row < board.dim; row++) {
				column_cross_checks[row] = [];
				
				if (board.squares[col][row].tile) {
					column_cross_checks[row].push(board.squares[col][row].tile.letter)
					continue;
				}

				// Find the words left and right (if applicable).
				let word_left = '';
				let j = col - 1;
				while (j != -1 && board.squares[j][row].tile) {
					word_left = board.squares[j][row].tile.letter + word_left;
					j -= 1;
				}

				let word_right = '';
				j = col + 1
				while (j != board.dim && board.squares[j][row].tile) {
					word_right += board.squares[j][row].tile.letter;
					j += 1;
				}

				// Find which (if any) letters in the alphabet form
				// a valid cross word.
				for (let letter of edition.alphabeta) {
					if (word_left && word_right) {
						if (goodWord(word_left + letter + word_right))
							column_cross_checks[row].push(letter);
					} else if (word_left) {
						if (goodWord(word_left + letter))
							column_cross_checks[row].push(letter);
					} else if (word_right) {
						if (goodWord(letter + word_right))
							column_cross_checks[row].push(letter);
					} else
						column_cross_checks[row].push(letter);
				}
			}
			cross_checks.push(column_cross_checks);
		}
		
		return cross_checks;
	}

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
		let no_anchors = true
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
					no_anchors = false;
					column.push(true);
					
				} else
					column.push(false);
			}
			anchors.push(column);
		}

		if (no_anchors)
			anchors[board.middle][board.middle] = true;

		return anchors;
	}

    // Removes a letter from the rack and returns it.
    // @param {Array<str>} rack the rack of letters to filter.
    // @return {Arrary<str>} the filtered rack.
    function filterRack(rack, letter) {
        let letter_removed = false;
        let new_rack = [];

        for (let current_letter of rack) {
            // Same letter, hasn't been removed.
            if (current_letter == letter && !letter_removed)
                letter_removed = true;
            // Different letter or letter already removed,
			// add it to the new rack.
            else
				new_rack.push(current_letter);
		}

        return new_rack;
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
     * Given a word played down, compute it's score.
	 * 
     * @param {str} word the word to compute the score of.
     * @param col, row the coordinates of the last letter
     * of the word on the board.
     * @param tilesPlayed the number of tiles played from the rack
     * played from the rack.
     * @return {int} the score of the word.
     */
    function scoreDownWord(word, col, row, allPlaced) {
		// Board.analyseMove does this by transposing the board and
		// running the across analysis.
		
		// Accumulator for word letter scores
		let wordScore = 0;

		// Accumulator for crossing words scores
		let crossWordsScore = 0;

		// Multipler for the vertical word
		let wordMultiplier = 1;

		let debug = false;//(word=="LURS");
		
		// Work back from the last letter
        for (let k = 0; k < word.length; k++) {
			let r = row - k;
			let letter = word[word.length - k - 1];
            let letterScore = edition.letterValue(letter);		
			let square = board.squares[col][r];
			
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

			if (debug && square.wordScoreMultiplier!=1)
				console.log(`${col},${r} *${square.wordScoreMultiplier}`);

			// This is a new tile, need to analyse cross words and
			// apply bonuses
			let crossWord = ''; // debug
			let crossWordScore = 0;
				
			// Look left
            for (let c = col - 1;
				 c >= 0 && board.squares[c][r].tile;
				 c--) {
                crossWordScore += board.squares[c][r].tile.score;
				if (debug)
					crossWord = board.squares[c][r].tile.letter + crossWord;
			}

			if (debug)
				crossWord += letter;
				
			// Look right
            for (let c = col + 1;
				 c < board.dim && board.squares[c][r].tile;
				 c++) {
                crossWordScore += board.squares[c][r].tile.score
				if (debug)
					crossWord = crossWord + board.squares[c][r].tile.letter;
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
        
        // If the full rack is played, add bonus
        if (allPlaced)
            wordScore += board.allPlacedBonus

        // Add cross word values to the down word value
		wordScore += crossWordsScore;
		
		if (debug)
			console.log(`${word}+cross->${wordScore}`);

        return wordScore;
	}

    // See scoreDownWord for the transpose with comments
    function scoreAcrossWord(word, col, row, allPlaced) {

        let wordScore = 0;
        let crossWordsScore = 0;
		let wordMultiplier = 1;

		for (let k = 0; k < word.length; k++) {
			let c = col - k;
			let letter = word[word.length - k - 1];
            let letterScore = edition.letterValue(letter);
			let square = board.squares[c][row];
			
			if (square.tileLocked) {
				wordScore += letterScore;
				continue;
			}

			wordMultiplier *= square.wordMultiplier;
			letterScore *= square.letterScoreMultiplier;
			wordScore += letterScore;
			
			let crossWordScore = 0;

            for (let r = row - 1;
				 r >= 0 && board.squares[c][r].tile;
				 r--) {
                crossWordScore += board.squares[c][r].tile.score;
			}
				
            for (let r = row + 1;
				 r < board.dim && board.squares[c][r].tile;
				 r++) {
                crossWordScore += board.squares[c][r].tile.score;
			}
		
            if (crossWordScore > 0) {
				crossWordScore += letterScore;
				crossWordScore *= square.wordMultiplier;
				crossWordsScore += crossWordScore;
			}
		}
		
        wordScore *= wordMultiplier;

		if (allPlaced)
            wordScore += board.allPlacedBonus;

        return wordScore + crossWordsScore;
	}

    /**
     * Given an anchor position, recursively compute possible across
     * word plays by extending right on the board. For each word,
     * compute its point value, and update the best_across_word score
     * accordingly.
	 * 
     * @param col, row index of the anchor position
	 * on the board.
     * @param {Array<str>} rack the user's letter rack.
     * @param {str} current_word the current permutation of the word.
     * @param {Array<Array<int>>} rack_played_indices a list of the indices
	 * of letters played
     * from the rack while extending right. 
     */
	function extend_right(col, row, rack, current_word, rack_played_indices) {
		if (col >= board.dim)
			return;
		
        // For the current coordinate, find common letters between
		// the rack and cross checks.
        let common_letters = intersection(rack, across_cross_checks[col][row]);

        // Base Case - no common letters.
        if (board.squares[col][row].tile && common_letters.length == 0)
            return;

        // Case 1: empty cell.
        if (!board.squares[col][row].tile) {
            for (let letter of common_letters) {
                // Score the current word, if it's in the dictionary.
				if (goodWord(current_word + letter)) {
					
					if ((col + 1 < board.dim
						 && !board.squares[col + 1][row].tile)
						|| col == (board.dim - 1)) {
						
                        let word = current_word + letter;
						const rpi = rack_played_indices.concat([[col, row]]);
                        let score = scoreAcrossWord(
							word, col, row,
							rpi.length == 7);

                        // Update the best across word, if the score of
						// the current word is better.
						if (score > best_across_word.score) {
                            best_across_word.start = [col - word.length + 1, row];
                            best_across_word.word = word;
							best_across_word.score = score;
							console.log(`Best across ${word} ${score}`, rpi);
						}
					}
				}
                // Keep extending right to form words.
                extend_right(
                    col + 1, row,
                    filterRack(rack, letter),
                    current_word + letter,
                    rack_played_indices.concat([[col, row]])
                )
			}
		}
        // Case 2: occupied cell.
        else {
            // Score the current word, if it's in the dictionary.
            if (goodWord(
				current_word + board.squares[col][row].tile.letter)) {
				
                if ((col + 1 < board.dim && !board.squares[col + 1][row].tile)
					|| col == (board.dim - 1)) {
                    let word = current_word + board.squares[col][row].tile.letter;
                    let score = scoreAcrossWord(
						word, col, row, rack_played_indices.length == 7);

                    // Update the best across word, if the score of the current word is better.
                    if (score > best_across_word.score) {
                        best_across_word.start = [col - word.length + 1, row];
                        best_across_word.word = word;
                        best_across_word.score = score;
						console.log(`Best across ${word} ${score}`, rack_played_indices);
					}
				}
			}

            // Keep extending right to form words.
            extend_right(
                col + 1, row,
                rack,
                current_word + board.squares[col][row].tile.letter,
                rack_played_indices
            )
		}
	}

    /**
     * Given a position to the left of an anchor, recursively compute
     * possible across word plays by extending left before extending
     * right on the board. For each word, compute its point value, and
     * update the best_across_word score accordingly.
	 * 
     * @param col, row index of the current position on the board.
     * @param {Array<str>} rack the user's letter rack.
     * @param {str} left_part the current left_part of the word.
     */
    function extend_right_with_left_part(col, row, rack, left_part) {

		if (col < 0)
			return;

        // For the current coordinate, find common letters between the
        // rack and cross checks.
		let common_letters = intersection(rack, across_cross_checks[col][row]);

        // Base Case - no common letters
		if (common_letters.length == 0)
            return;

        // Case 1: the cell to the left of the current index is empty,
		// or col = 0.
		if (col == 0 || !board.squares[col - 1][row].tile) {
            for (let letter of common_letters) {
                let word = letter + left_part;
                let rack_played_indices = [];
				
				for (let k = 0; k < word.length; k++)
                    rack_played_indices.push([col + k, row]);

                // Extend right to form words.
                extend_right(
                    col + word.length, row,
                    filterRack(rack, letter),
                    word,
                    rack_played_indices
                );

                // Keep extending left.
                extend_right_with_left_part(
                    col - 1, row,
                    filterRack(rack, letter),
                    word
                );
			}
		}
        // Case 2: the cell to the left of the current index is occupied.
	}
	
    /**
     * Given an anchor position, recursively compute possible down
     * word plays by extending down the board. For each word,
     * compute its point value, and update the best_down_word score
     * accordingly.
	 * 
     * @param col, row index of the current position on the board.
     * @param {Array<str>} rack the user's letter rack.
     * @param {str} current_word the current permutation of the word.
     * @param {Array<Array<int>>} rack_played_indices a list of the
	 * indices of letters played
     * from the rack while extending down. 
     */
    function extend_down(col, row, rack, current_word, rack_played_indices) {

		if (row >= board.dim)
			return;
		if (/[0-9]/.test(current_word)) {
			console.log(col, row, rack, rack_played_indices);
			console.log(current_word);
			throw Error("NO");
		}
		if (!down_cross_checks[col])
			throw Error("UGH "+col);
		
		// For the current coordinate, find common letters between the
		// rack and cross checks.
		let common_letters = intersection(rack, down_cross_checks[col][row]);

        // Base Case - no tile and no useable letters in the rack
        if (!board.squares[col][row].tile && common_letters.length == 0)
            return;

		//console.log(`Extend down '${current_word}' ${col},${row} rack `, rack);

        if (board.squares[col][row].tile) {
			// Case 2: occupied cell.
			let letter = board.squares[col][row].tile.letter;
            if (goodWord(current_word + letter)) {				
				// New word is in the dictionary
				
                if ((row + 1 < board.dim && !board.squares[col][row + 1].tile)
					|| row == (board.dim - 1)) {
					// The next tile down blank or off the board, so
					// this is a playable word

                    let word = current_word + letter;
                    let score = scoreDownWord(
						word, col, row, rack_played_indices.length == 7);

                    // Update the best across word, if the score of the
					// current word is better.
                    if (score > best_down_word.score) {
                        best_down_word.start = [col, row - word.length + 1];
                        best_down_word.word = word;
                        best_down_word.score = score;
						console.log(`Best down ${word} ${score}`,
									rack_played_indices);
					}
				}
			}

            // Keep extending down to form words.
            extend_down(
                col, row + 1,
                rack, // not filtered
                current_word + board.squares[col][row].tile.letter,
                rack_played_indices
            );
		}
        // Case 1: empty cell.
        else {
            for (let letter of common_letters) {
                if (goodWord(current_word + letter)) {
					// New word is in the dictionary

                    if ((row + 1 < board.dim
						 && !board.squares[col][row + 1].tile)
						|| row == (board.dim - 1)) {
						// The next tile down blank or off the board, so
						// this is a playable word
	
                        let word = current_word + letter;
						let rpi = rack_played_indices.concat([[col, row]]);
                        let score = scoreDownWord(
							word, col, row,
							rpi.length == 7);

                        // Update the best across word, if the score of
						// the current word is better.
                        if (score > best_down_word.score) {
                            best_down_word.start = [col, row - word.length + 1];
                            best_down_word.word = word;
                            best_down_word.score = score;
							console.log(`Best down ${word} ${score}`, rpi);
						}
					}
				}
                
                // Keep extending down to form words.
                extend_down(
                    col, row + 1,
                    filterRack(rack, letter),
                    current_word + letter,
                    rack_played_indices.concat([[col, row]])
                );
			}
		}
	}

    /**
     * Given a position above an anchor, recursively compute possible
     * down word plays by extending up before extending down on the
     * board. For each word, compute its point value, and update the
     * best_down_word score accordingly.
	 * 
     * @param col, row the current position on the board.
     * @param {Array<str>} rack the user's letter rack.
     * @param {str} top_part the current top_part of the word.
     */
    function extend_down_with_top_part(col, row, rack, top_part) {

		if (row < 0)
			return; // out of bounds
		
        // For the current coordinate, find common letters between
		// the rack and cross checks.
		let common_letters = intersection(rack, down_cross_checks[col][row]);

        // Base Case - no common letters
        if (common_letters.length == 0)
            return;

        if (row == 0 || !board.squares[col][row - 1].tile) {
			// The cell above is empty, or off the board.

            for (let letter of common_letters) {
                let word = letter + top_part;
                let rack_played_indices = [];

                for (let k = 0; k < word.length; k++)
					rack_played_indices.push([col, row + k]);

                // Extend down to form words.
                extend_down(
                    col, row + word.length,
                    filterRack(rack, letter),
                    word,
                    rack_played_indices
                );

                // Keep extending up.
                extend_down_with_top_part(
                    col, row - 1,
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

		across_cross_checks = acrossCrosschecks(board);
		down_cross_checks = downCrosschecks(board);

		best_down_word = {
			start: [-1, -1],
			word: '',
			score: 0,
			down: true
		};

		best_across_word = {
			start: [-1, -1],
			word: '',
			score: 0,
			down: false
		};

		// Find down words
		for (let col = 0; col < board.dim; col++) {
			for (let row = 0; row < board.dim; row++) {
				if (anchors[col][row]) {
					// Valid anchor site
					
					// Case 1: cell above the anchor is empty of off
					if (row > 0 && !board.squares[col][row - 1].tile) {
						extend_down(
							col, row,
							rack,
							'',
							[]
						);

						extend_down_with_top_part(
							col, row - 1,
							rack,
							''
						);
					}
					// Case 2: cell above the anchor is occupied.
					else {
						// Grab the word above the anchor, if there is one.
						let word = '';
						let k = row - 1;
						while (k >= 0 && board.squares[col][k].tile) {
							word = board.squares[col][k].tile.letter + word;
							k--;
						}

						// Look down from the anchor.
						extend_down(
							col, row,
							rack,
							word,
							[]
						);
					}
				}
			}
		}

		// Find across words
		for (let row = 0; row < board.dim; row++) {
			for (let col = 0; col < board.dim; col++) {
				if (anchors[row][col]) {
					// Case 1: cell to the left of the anchor is empty.
					if (col > 0 && !board.squares[col - 1][row].tile) {
						extend_right(
							col, row,
							rack,
							'',
							[]
						);

						extend_right_with_left_part(
							col - 1, row,
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
						extend_right(
							col, row,
							rack,
							word,
							[]
						);
					}
				}
			}
		}

		if (best_across_word.score > best_down_word.score)
			return best_across_word
		else
			return best_down_word
	}

	return findBestMove;
});
