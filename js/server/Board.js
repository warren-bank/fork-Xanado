/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, node, jquery */

define(() => {

  /**
   * Server-side Board functionality mix-in
   * @mixin ServerBoard
   */
  const ServerBoard = {
    
    /**
     * Given a play at col, row, compute it's score. Used in
     * findBestPlay, and must perform as well as possible. Read
     * the description of {@linkcode Board#analysePlay|analysePlay}
     * to understand the difference between these two related functions.
     * Note: does *not* include any bonuses due to number of tiles played.
     * @param {number} col the col of the LAST letter
     * @param {number} row the row of the LAST letter
     * @param {number} dcol 1 if the word being played across
     * @param {number} drow 1 if the word is being played down
     * @param {Tile[]} tiles a list of tiles that are being placed
     * @param {string[]?} words optional list to be populated with
     * words that have been created by the play
     * @return {number} the score of the play.
     */
    scorePlay(col, row, dcol, drow, tiles, words) {
      //console.debug(`scorePlay(${col},${row},${dcol},${drow},`,
      //            tiles.map(t => t.stringify()).join(";"));
      // Accumulator for the primary word being formed by the tiles
      let wordScore = 0;

      // Accumulator for crossing words scores.
      let crossWordsScore = 0;

      // Multipler for the main word
      let wordMultiplier = 1;

      // One behind first tile offset
      let c = col - dcol * tiles.length;
      let r = row - drow * tiles.length;

      for (let i = 0; i < tiles.length; i++) {
        c += dcol;
        r += drow;
        const tile = tiles[i];
        let letterScore = tile.score;
        const square = this.at(c, r);
        if (square.isLocked()) {
          wordScore += letterScore;
          continue; // pre-existing tile, no bonuses
        }

        // Letter is being placed, so letter multiplier applies to all
        // new words created, including cross words
        letterScore *= (square.letterScoreMultiplier || 1);

        wordScore += letterScore;

        // Multiplier for any new words that cross this letter
        const crossWordMultiplier = (square.wordScoreMultiplier || 1);
        wordMultiplier *= crossWordMultiplier;

        // This is a new tile, need to analyse cross words and
        // apply bonuses
        let crossWord = "";
        let crossWordScore = 0;

        // Look left/up
        for (let cp = c - drow, rp = r - dcol;
             cp >= 0 && rp >= 0 && this.at(cp, rp).tile;
             cp -= drow, rp -= dcol) {
          const tile = this.at(cp, rp).tile;
          crossWord = tile.letter + crossWord;
          crossWordScore += tile.score;
        }

        crossWord += tile.letter;

        // Look right/down
        for (let cp = c + drow, rp = r + dcol;
             cp < this.cols && rp < this.rows
             && this.at(cp, rp).tile;
             cp += drow, rp += dcol) {
          const tile = this.at(cp, rp).tile;
          crossWord += tile.letter;
          crossWordScore += tile.score;
        }

        if (crossWordScore > 0) {
          // This tile (and bonuses) contribute to cross words
          crossWordScore += letterScore;
          crossWordScore *= crossWordMultiplier;
          if (words)
            words.push({
              word: crossWord,
              score: crossWordScore
            });

          crossWordsScore += crossWordScore;
        }
      }

      wordScore *= wordMultiplier;

      if (words)
        words.push({
          word: tiles.map(tile => tile.letter).join(""),
          score: wordScore
        });

      // Add cross word values to the main word value
      wordScore += crossWordsScore;

      return wordScore;
    }
  };

  return ServerBoard;
});
