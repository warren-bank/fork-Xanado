/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, node, jquery */

define([ "game/Move" ], Move => {

  /**
   * Browser-side mixin for {@linkcode Board}
   * @mixin BrowserBoard
   */
  const BrowserBoard = {

    /**
     * Calculate score for all words that involve new tiles.
     * This is used on the UI side, when the placement may be fragmented
     * and difficult to analyse.
     * @function
     * @instance
     * @memberof BrowserBoard
     * @param {Move.wordSpec[]} words list to update
     * @return {number} the total score
     * @private
     */
    scoreNewWords(words) {
      let totalScore = 0;
      let row, col;

      const taste = (dcol, drow) => {
        let wordScore = 0;
        let letters = "";
        let wordMultiplier = 1;
        let isNewWord = false;
        while (col < this.cols
               && row < this.rows
               && this.at(col, row).tile) {
          const square = this.at(col, row);
          let letterScore = square.tile.score;
          isNewWord = isNewWord || !square.isLocked();
          if (!square.isLocked()) {
            letterScore *= (square.letterScoreMultiplier || 1);
            wordMultiplier *= (square.wordScoreMultiplier || 1);
          }
          wordScore += letterScore;
          letters += square.tile.letter;
          col += dcol;
          row += drow;
        }
        if (isNewWord) {
          wordScore *= wordMultiplier;
          totalScore += wordScore;
          words.push({
            word: letters,
            score: wordScore
          });
        }
      };

      for (row = 0; row < this.rows; row++)
        for (col = 0; col < this.cols - 1; col++)
          if (this.at(col, row).tile && this.at(col + 1, row).tile)
            taste(1, 0);
      
      for (col = 0; col < this.cols; col++)
        for (row = 0; row < this.rows - 1; row++)
          if (this.at(col, row).tile && this.at(col, row + 1).tile)
            taste(0, 1);
      
      return totalScore;
    },

    /**
     * UI-side move calculation. Constructs a {@linkcode Move}.
     * `analysePlay` and {@linkcode Board#scorePlay|scorePlay} do
     * essentially the same job; calculate the score for a given
     * play. They differ in respect of their application;
     * `analysePlay` is used client-side to calculate a move made by a
     * human and has to be tolerant of disconnected plays and other
     * errors. It works on a board with tiles placed but not locked.
     * `scorePlay` is used server-side to calculate the score for a
     * play being constructed on the server side by a robot, and has
     * to perform as well as possible. Note that neither `analysePlay`
     * nor `scorePlay` calculate bonuses for number of tiles played.
     * @function
     * @instance
     * @memberof BrowserBoard
     * @return {(Move|string)} Move, or a string if there is a problem
     */
    analysePlay() {
      // Check that the start field is occupied
      if (!this.at(this.midcol, this.midrow).tile)
        return /*i18n*/"Centre must be used";

      // Determine that the placement of the Tile(s) is legal

      // Find top-leftmost placed tile
      let topLeftX, topLeftY, tile;
      this.forEachTiledSquare((square, col, row) => {
        if (square.isLocked())
          return false;
        tile = square.tile;
        topLeftX = col;
        topLeftY = row;
        return true;
      });

      // Remember which newly placed tile positions are legal
      const legalPlacements = new Array(this.cols);
      for (let col = 0; col < this.cols; col++)
        legalPlacements[col] = new Array(this.rows);

      legalPlacements[topLeftX][topLeftY] = true;

      let isTouchingOld = this.touchingOld(topLeftX, topLeftY);
      let horizontal = false;
      for (let col = topLeftX + 1; col < this.cols; col++) {
        if (this.at(col, topLeftY).isEmpty())
          break;
        if (!this.at(col, topLeftY).isLocked()) {
          legalPlacements[col][topLeftY] = true;
          horizontal = true;
          isTouchingOld =
          isTouchingOld || this.touchingOld(col, topLeftY);
        }
      }

      if (!horizontal) {
        for (let row = topLeftY + 1; row < this.rows; row++) {
          if (!this.at(topLeftX, row).tile) {
            break;
          } else if (!this.at(topLeftX, row).isLocked()) {
            legalPlacements[topLeftX][row] = true;
            isTouchingOld =
            isTouchingOld || this.touchingOld(topLeftX, row);
          }
        }
      }

      if (!isTouchingOld && !legalPlacements[this.midcol][this.midrow])
        return /*i18n*/"Disconnected placement";

      // Check whether there are any unconnected placements
      let totalTiles = 0;
      let disco = false;
      this.forEachTiledSquare((square, col, row) => {
        totalTiles++;
        disco = disco || (!square.isLocked() && !legalPlacements[col][row]);
      });
      
      if (disco)
        return /*i18n*/"Disconnected placement";

      if (totalTiles < 2)
        return /*i18n*/"First word must be at least two tiles";

      const placements = [];
      this.forEachTiledSquare(square => {
        if (!square.isLocked()) {
          placements.push(square.tile);
        }
      });
      
      const words = [];
      const score = this.scoreNewWords(words);
      return new Move(
        {
          placements: placements,
          score: score,
          words: words
        });
    },

    /**
     * Create the UI representation
     * @function
     * @instance
     * @memberof BrowserBoard
     * @param {jQuery} $table table to populate
     */
    $populate($table) {
      const $tbody = $("<tbody></tbody>");
      $table.append($tbody);
      for (let row = 0; row < this.rows; row++) {
        const $tr = $("<tr></tr>");
        $tbody.append($tr);
        for (let col = 0; col < this.cols; col++) {
          const square = this.at(col, row);
          const $td = $("<td></td>");
          $tr.append($td);
          square.$populate($td);
        }
      }
    }
  };

  return BrowserBoard;
});
