/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, browser, jquery */

define([ "platform", "common/Types" ], (Platform, Types) => {

  const UIEvents = Types.UIEvents;

  /**
   * Browser-side mixin for {@linkcode Tile}
   * @mixin BrowserTile
   */
  const BrowserTile = {

    /**
     * Create or refresh the jQuery representation of the tile.
     * @function
     * @instance
     * @memberof BrowserTile
     * @param {Square?} square where this tile is placed. If the
     * tile is currently unplaced, this can be undefined.
     */
    $ui(square) {
      if (this.$tile) {
        if (this.isBlank)
          this.$tile.find(".letter").text(this.letter);
      }
      else {
        const $glyph = $("<div></div>")
              .addClass("glyph")
              .append(`<span class="letter">${this.letter}</span>`)
              .append(`<span class="score">${this.score}</span>`);
        this.$tile = $("<div></div>")
        .addClass("Tile")
        .append($glyph);
      }

      // Associate the square passed with the tile UI. This is only
      // used when dragging the tile away from the square, so we know
      // where it was previously placed. Note that this creates a
      // circular dependency, which has to be broken when generting
      // JSON.
      this.$tile.data("Square", square);

      // Attach the tile to the DOM so it is available for clicks
      this.$tile.data("Tile", this);

      if (this.isBlank)
        this.$tile.addClass("blank-letter");
      
      if (this.isLocked) {
        if (this.$tile.hasClass("ui-draggable"))
          this.$tile.draggable("destroy");
        this.$tile
        .removeClass("unlocked-tile")
        .addClass("locked-tile");
      }
      else {
        // tile isn't locked, make sure it's draggable. It might be
        // a new UI, or it may have lost its draggability when it was
        // locked onto the board, and is being unlocked by an undo.
        if (!this.$tile.hasClass("ui-draggable")) {
          this.$tile
          .draggable({
            revert: "invalid",
            opacity: 1,
            helper: "clone",
            appendTo: 'body',
            start: (event, jui) => {
              Platform.trigger(UIEvents.CLEAR_SELECT);
              // Highlight drag source
              this.$tile.css({ opacity: 0.5 });
              $(jui.helper)
              .animate({"font-size" : "110%"}, 300)
              .addClass("being-dragged");
            },
            drag: (event, jui) => $(jui.helper).addClass("being-dragged"),
            stop: (event, jui) => this.$tile.css({ opacity: 1 })
          });
        }
        this.$tile
        .removeClass("locked-tile")
        .addClass("unlocked-tile");
      }

      return this.$tile;
    },

    /**
     * Change the visual representation of the tile to show it as
     * (un)selected
     * @function
     * @instance
     * @memberof BrowserTile
     * @param {boolean} sel 
     */
    showSelected(sel) {
      if (sel) {
        this.$tile.addClass("selected");
      } else
        this.$tile.removeClass("selected");
    }
  };

  return BrowserTile;
});
