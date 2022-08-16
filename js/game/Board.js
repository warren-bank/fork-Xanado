/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, node, jquery */

define([
  "platform", "common/Utils", "game/Surface", "game/Tile", "game/Move",
  requirejs.isBrowser ? "browser/Board" : "server/Board"
], (Platform, Utils, Surface, Tile, Move, PlatformMixin) => {

  /**
   * The square game board.
   * @extends Surface
   * @mixes BrowserBoard
   * @mixes ServerBoard
   */
  class Board extends PlatformMixin(Surface) {

    /**
     * Row of middle square on board.
     * @member {number}
     */
    midrow;

    /**
     * Column of middle square on board.
     * @member {number}
     */
    midcol;

    /**
     * @param {Edition} edition the edition defining the board layout
     */
    constructor(edition) {
      if (edition instanceof Board) {
        super("Board", edition.cols, edition.rows,
              (col, row) => edition.at(col, row).type);
      } else {
        super("Board", edition.cols, edition.rows,
              (col, row) => edition.squareType(col, row));

        this.midrow = Math.floor(edition.rows / 2);
        this.midcol = Math.floor(edition.cols / 2);
      }
    }

    /**
     * Load the board from the string representation output by
     * {@linkcode Board#toString|toString}. This is for use in tests.
     * @param {string} sboard string representation of the board
     * @param {Edition} edition the edition defining the board layout.
     * This has to be provided because we don't cache the actual
     * Edition in the Board.
     */
    parse(sboard, edition) {
      const rows = sboard.split("\n");
      for (let row = 0; row < this.rows; row++) {
        const r = rows[row].split("|");
        for (let col = 0; col < this.cols; col++) {
          const letter = r[col + 1];
          if (letter != " ") {
            // Treat lower-case letters as cast blanks.
            // May not work in non-latin languages.
            const isBlank = (letter.toUpperCase() != letter);
            const tile = new Tile({
              letter: letter.toUpperCase(),
              isBlank: isBlank,
              score: isBlank ? 0 : edition.letterScore(letter)
            });
            this.at(col, row).placeTile(tile, true);
          }
        }
      }
    }

    /**
     * True if one of the neighbours of [col, row] is already occupied by
     * a tile that was placed in a previous move
     * @param {number} col 0-based row
     * @param {number} row 0-based row
     */
    touchingOld(col, row) {
      return (
        (col > 0 && this.at(col - 1, row).tile
         && this.at(col - 1, row).isLocked())
        || (col < this.cols - 1 && this.at(col + 1, row).tile
            && this.at(col + 1, row).isLocked())
        || (row > 0 && this.at(col, row - 1).tile
            && this.at(col, row - 1).isLocked())
        || (row < this.rows - 1 && this.at(col, row + 1).tile
            && this.at(col, row + 1).isLocked()));
    }

    /* istanbul ignore next */
    /**
     * Generate a string representation of the board in the format
     * readable by {@linkcode Board#parse|parse}
     * @override
     */
    stringify() {
      let s = "";

      for (let row = 0; row < this.rows; row++) {
        const r = [];
        for (let col = 0; col < this.cols; col++) {
          const square = this.at(col, row);
          const t = square.tile;
          if (t) {
            // Show cast blanks using lower case letters
            // May not work in non-Latin languages.
            if (t.isBlank)
              r.push(t.letter.toLowerCase());
            else
              r.push(t.letter);
          } else {
            if ((square.letterScoreMultiplier || 0) > 1)
              r.push(square.letterScoreMultiplier);
            else if ((square.wordScoreMultiplier || 0) > 1)
              r.push(4 + square.wordScoreMultiplier);
            else
              r.push(" ");
          }
        }
        s += `|${r.join("|")}|\n`;
      }
      return s;
    }
  }

  return Board;
});
