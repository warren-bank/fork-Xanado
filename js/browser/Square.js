/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, browser, jquery */

define([ "platform", "common/Types" ], (Platform, Types) => {

  // Translation strings, only required to keep npm run tx happy
  // /*i18n*/"long-D" /*i18n*/"short-D"
  // /*i18n*/"long-M" /*i18n*/"short-M"
  // /*i18n*/"long-Q" /*i18n*/"short-Q"
  // /*i18n*/"long-T" /*i18n*/"short-T"
  // /*i18n*/"long-_" /*i18n*/"short-_"
  // /*i18n*/"long-d" /*i18n*/"short-d"
  // /*i18n*/"long-q" /*i18n*/"short-q"
  // /*i18n*/"long-t" /*i18n*/"short-t"

  const UIEvents = Types.UIEvents;

  /**
   * Browser-side mixin for {@linkcode Square}
   * @mixin BrowserSquare
   */
  class BrowserSquare {

    /**
     * Create the jquery representation of the square.
     * @function
     * @instance
     * @memberof BrowserSquare
     * @param {jQuery} $td TD to make into a square
     */
    $populate($td) {
      $td
      .addClass(`square-${this.type}`)
      .attr("id", this.id)
      .on("click",
          () => Platform.trigger(UIEvents.SELECT_SQUARE, [ this ]));

      if (typeof this.underlay !== "undefined") {
        // Simple underlay character i.e. SWAP
        const $underlay = $(document.createElement("div")).addClass("underlay");
        $td.append($underlay);
        $underlay.text(this.underlay);
      } else if (this.type !== "_") {
        $td.addClass("score-multiplier");
        // map long- and short- to language strings describing the
        // multiplier. data-long is for when the display resolution
        // is high, data-short for when it is tight e.g. on mobile
        // devices. The relevant string is selected in CSS.
        const $underlay = $(document.createElement("div")).addClass("underlay");
        $td.append($underlay);
        $underlay
        .attr("data-long", Platform.i18n(`long-${this.type}`))
        .attr("data-short", Platform.i18n(`short-${this.type}`));
      }

      // Triggering a PLACE_TILE event is expensive, so populate the
      // tile direct
      if (this.tile)
        this.$placeTile($td);
      else
        // Call to get the droppable attached
        this.$unplaceTile($td);

      return $td;
    }

    /**
     * A tile has been placed on this square and we have to adjust the
     * UI accordingly. This is normally invoked in response to a
     * PLACE_TILE event, though may also be called directly during
     * board and rack creation. The tile is assumed to already be
     * attached to the Square.
     * @function
     * @instance
     * @memberof BrowserSquare
     * @param {jQuery?} $td jquery object for the TD of the square. If
     * undefined, the TD will be found from the id.
     */
    $placeTile($td) {
      if (!$td) $td = $(`#${this.id}`);

      Platform.assert(this.tile);

      // Can't drop on a tiled square
      if ($td.hasClass("ui-droppable"))
        $td.droppable("destroy");

      // Compatability hack
      /* istanbul ignore next */
      if (this.tileLocked) this.tile.isLocked = true;

      const $tile = this.tile.$ui(this);
      $td.append($tile);
    }

    /**
     * Remove the currently placed tile's UI from the square's
     * UI. This is normally invoked in response to an UNPLACE_TILE
     * event, though may also be called directly during board and rack
     * creation. By the time this is called, the tile has already been
     * removed from the model of the square, we just need to detach
     * the UI.
     * @function
     * @instance
     * @memberof BrowserSquare
     * @param {Tile?} tile the tile being unplaced.
     * @param {jQuery?} $td jquery object for the TD of the square. If
     * undefined, the TD will be found from the ID.
     */
    $unplaceTile($td) {
      Platform.assert(!this.tile);
      if (!$td) $td = $(`#${this.id}`);
      // There may be no TD if the tile is being unplaced from
      // another player's rack.
      if ($td.length === 0)
        return;

      // Remove the tile UI from the square (without deleting it)
      $td.find(".Tile").detach();

      // Reinstate the droppable target, which was removed
      // in $placeTile (or is not yet added)
      Platform.assert(!$td.hasClass("ui-droppable"));
      $td.droppable({
        hoverClass: "drop-active",
        drop: (event, jui) => {
          // jui.draggable is a $tile, which has had data("Square")
          // set in Tile.$ui
          const from = $(jui.draggable).data("Square");
          // Tell the main UI about it
          Platform.trigger(UIEvents.DROP_TILE, [ from, this ]);
        }
      });
    }

    /**
     * Set the underlay
     * @function
     * @instance
     * @memberof BrowserSquare
     * @param {boolean} sel
     */
    setUnderlay(ch) {
      this.underlay = ch;
    }

    /**
     * Change the visual representation of the square (or the tile on it)
     * to reflect the fact that it is selected in the UI
     * @function
     * @instance
     * @memberof BrowserSquare
     * @param {boolean} sel
     */
    select(sel) {
      const $tc = $("#typingCursor").hide();
      if (this.tile)
        this.tile.showSelected(sel);
      else if (sel)
        $(`#${this.id}`).prepend($tc.show());
    }
  }

  return BrowserSquare;
});
