/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node, jquery */

/**
 * A Rack is a set of tiles that a player can play from. It's
 * a 1D array of Square.
 */
define([
  "platform", "common/Utils", "game/Surface", "game/Tile",
  requirejs.isBrowser ? "browser/Rack" : "common/Mixin"
], (Platform, Utils, Surface, Tile, Mixin) => {

  /**
   * A Rack is a 1-column {@linkcode Surface}
   * @extends Surface
   * @mixes BrowserRack
   */
  class Rack extends Surface {

    /**
     * @param {string|Rack} id unique id for this rack, or a rack to copy.
     * The squares and the tiles they carry will be copied as well.
     * @param {number} size rack size
     * @param {string?} underlay text string with one character for
     * each cell in UI of the rack. This is the SWAP string that
     * underlies the swap rack.
     */
    constructor(id, size, underlay) {
      // The id will be used as the base for generating the id's
      // for the Squares in the underlying Surface. Note that
      // the UI will have Rack objects for the player rack and
      // the swap rack, but will also have racks that have no UI
      // for the other players. The ID for these racks must be
      // player specific.
      if (id instanceof Rack) {
        // Copy constructor
        // Only used in game simulation. Underlay not supported.
        super(id.id, id.cols, 1, () => "_");
        id.forEachTiledSquare(square => {
          this.addTile(new Tile(square.tile));
          return false;
        });
      } else
        super(id, size, 1, () => "_");
    
      if (typeof underlay !== "undefined") {
        let idx = 0;
        this.forEachSquare(square => {
          square.setUnderlay(underlay.charAt(idx++));
          return idx === underlay.length;
        });
      }
    }

    /**
     * One dimensional
     * @override
     */
    at(col) {
      return super.at(col, 0);
    }

    /**
     * Add a Tile to the rack
     * @param {Tile} tile the Tile to add, must != null
     * @return {Square?} the square where the tile was placed
     * (undefined if it couldn't be placed)
     */
    addTile(tile) {
      let rackSquare;
      tile.reset();
      this.forEachEmptySquare(square => {
        rackSquare = square;
        square.placeTile(tile);
        return true;
      });
      return rackSquare;
    }

    /**
     * Put tiles back on the rack.
     * @param {Tile[]} tiles list of tiles
     * @return {Square[]} squares the tiles were placed on
     */
    addTiles(tiles) {
      return tiles.map(tile => this.addTile(tile));
    }

    /**
     * Get an unsorted list of the letters currently on the rack.
     * Blanks are represented by a space.
     * @return {string[]}
     */
    letters() {
      return this.tiles().map(tile => tile.letter);
    }

    /**
     * Find the Square that contains a Tile that can represent
     * the given letter.
     * If a letter tile can't be found, a blank will be used if there
     * is one.
     * @param {string} letter the letter to find
     * @return {Square} carrying a matching tile, or undefined
     */
    findSquare(letter) {
      let square;
      this.forEachTiledSquare(sq => {
        if (!square && sq.tile.isBlank
            || sq.tile.letter === letter)
          square = sq;
      });

      return square;
    }

    /**
     * Find and remove a tile from the rack.
     * @param {Tile} remove the Tile to remove
     * @return {Tile} the removed tile
     */
    removeTile(remove) {
      const square = this.findSquare(remove.letter);
      Platform.assert(square,
      `Cannot find '${remove.letter}' on ${this.stringify()}`);
      const tile = square.tile;
      // If the tile is a blank, set the letter to the remove letter
      if (tile.isBlank)
        tile.letter = remove.letter;
      square.unplaceTile();
      return tile;
    }

    /**
     * Take tiles out of the rack
     * @param {Tile[]} tiles list of tiles
     * @param {Rack} rack rack
     * @return {Tile[]} list of tiles removed
     */
    removeTiles(tiles) {
      const racked = [];
      for (const tile of tiles) {
        const removed = this.removeTile(tile);
        Platform.assert(removed, `${Utils.stringify(tile)} missing from rack`);
        racked.push(removed);
      }
      return racked;
    }

    /**
     * Shuffle tile positions within the rack
     * @return {Rack} this
     */
    shuffle() {
      const tiles = [];
      let i;
      for (i = 0; i < this.cols; i++) {
        const square = this.at(i);
        if (square.tile)
          tiles.push(square.unplaceTile());
      }
      for (i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = tiles[i];
        tiles[i] = tiles[j];
        tiles[j] = temp;
      }
      this.addTiles(tiles);

      return this;
    }

    /**
     * Get a list of letters on the rack that are not blanks
     * @return {string[]}
     */
    lettersLeft() {
      return this.tiles().filter(tile => !tile.isBlank)
      .map(tile => tile.letter);
    }

    /* istanbul ignore next */
    /**
     * Debug
     */
    stringify() {
      return `[${this.tiles().map(t => Utils.stringify(t)).join(",")}]`;
    }
  }

  if (Mixin)
    Object.assign(Rack.prototype, Mixin);

  return Rack;
});
