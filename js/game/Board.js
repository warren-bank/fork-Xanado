/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, node, jquery */

define([
  "platform",
  "js/common/Utils",
  "js/game/Surface", "js/game/Tile", "js/game/Move", "js/game/Edition"
], (
  Platform, Utils,
  Surface, Tile, Move, Edition,
) => {

  /**
   * The square game board.
   */
  class Board extends Surface {

    /**
     * Row of middle square on board.
     * @member {number}
     */
    midrow = -1;

    /**
     * Column of middle square on board.
     * @member {number}
     */
    midcol = -1;

    /**
     * @param {object} factory class object mapping class name to a class
     * @param {Edition|Board} spec an Edition defining the board layout,
     * or a Board to copy. The tiles on the old board will NOT be copied.
     */
    constructor(factory, spec) {
      const info = {
        id: "Board",
        rows: spec.rows,
        cols: spec.cols
      };
      if (spec instanceof Board)
        info.type = (col, row) => spec.at(col, row).type;
      else // if (spec instanceof Edition)
        info.type = (col, row) => spec.squareType(col, row);

      super(factory, info);

      this.midrow = Math.floor(this.rows / 2);
      this.midcol = Math.floor(this.cols / 2);
    }

    /**
     * Determine if any any unlocked tiles are placed on the board.
     * @return {boolean} true if there are placed but unlocked tiles
     */
    hasUnlockedTiles() {
      return this.forEachTiledSquare(sq => (!sq.tile.isLocked));
    }

    /**
     * Populate the board from a string output by
     * {@linkcode Board#toString|toString}. This is for use in tests.
     * @param {object} factory object giving Game classes to instantiate
     * @param {Edition} edition the edition defining the board layout.
     * This has to be provided because we don't cache the actual
     * Edition in the Board.
     * @param {string} tiles string representation of the board
     * @private
     */
    parse(factory, edition, tiles) {
      const rows = tiles.split("\n");
      assert(rows.length >= this.rows, "Too many rows");
      for (let row = 0; row < this.rows; row++) {
        const r = rows[row].split("|");
        assert(r.length === this.cols + 2,
                        `${r.length} === ${this.cols} + 2`);
        for (let col = 0; col < this.cols; col++) {
          const letter = r[col + 1];
          if (letter != " ") {
            // Treat lower-case letters as cast blanks.
            // May not work in non-latin languages.
            const isBlank = (letter.toUpperCase() != letter);
            const tile = new factory.Tile({
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
         && this.at(col - 1, row).hasLockedTile())
        || (col < this.cols - 1 && this.at(col + 1, row).tile
            && this.at(col + 1, row).hasLockedTile())
        || (row > 0 && this.at(col, row - 1).tile
            && this.at(col, row - 1).hasLockedTile())
        || (row < this.rows - 1 && this.at(col, row + 1).tile
            && this.at(col, row + 1).hasLockedTile()));
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
