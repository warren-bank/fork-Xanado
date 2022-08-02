/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, browser, jquery */

define([ "platform" ], Platform => {

  // Translation strings, only required to keep npm run tx happy
  // /*i18n*/"long-D" /*i18n*/"short-D"
  // /*i18n*/"long-M" /*i18n*/"short-M"
  // /*i18n*/"long-Q" /*i18n*/"short-Q"
  // /*i18n*/"long-T" /*i18n*/"short-T"
  // /*i18n*/"long-_" /*i18n*/"short-_"
  // /*i18n*/"long-d" /*i18n*/"short-d"
  // /*i18n*/"long-q" /*i18n*/"short-q"
  // /*i18n*/"long-t" /*i18n*/"short-t"

  // .data() recording Square on a $tile
  const DATA_SQUARE = "Square";

  /**
   * Browser-side mixin for {@linkcode Square}
   * @mixin BrowserSquare
   */
  const BrowserSquare = {

    /**
     * Create the jquery representation of the base square. This is a
     * td element that will be inserted in a Surface table.
     * Note that the table is initially empty.
     * @function
     * @instance
     * @memberof BrowserSquare
     * @param {string} base for id='s
     */
    $td() {
      const $td =
            $(`<td></td>`)
            .addClass(`square-${this.type}`)
            .attr("id", this.id)
            .on("click", () => Platform.trigger("SelectSquare", [ this ]));
      // map long- and short- to language strings. long is for when the
      // display resolution is high, short for when it is tight e.g. on
      // mobile devices. The relevant string is selected in CSS.
      if (typeof this.underlay !== "undefined") {
        const $underlay = $("<div></div>").addClass("underlay");
        $underlay.text(this.underlay);
        $td.append($underlay);
      } else if (this.type !== "_") {
        const $underlay = $("<div></div>").addClass("underlay");
        $underlay
        .attr("data-long", Platform.i18n(`long-${this.type}`))
        .attr("data-short", Platform.i18n(`short-${this.type}`));
        $td.append($underlay);
      }

      // Can't place or unplace tiles until the td is attached
      // to the table and the table is in the body. Triggering
      // a TilePlaced event doesn't work, so have to pass in the $td
      if (this.tile)
        this.$placeTile($td);
      else
        this.$unplaceTile(undefined, $td);

      return $td;
    },

    /**
     * Attach a tile's UI to the square's UI, constructing the tile
     * UI as necessary.
     * @function
     * @instance
     * @memberof BrowserSquare
     * @param {jQuery?} $td jquery object for the TD of the square. This
     * optional parameter is needed during initialisation, before the
     * square objects are added to the body.
     */
    $placeTile($td) {
      if (!$td) $td = $(`#${this.id}`);

      // Can't drop on a tiled square
      if($td.hasClass("ui-droppable"))
        $td.droppable("destroy");

      const $tile = this.tile.$div();
      $td.append($tile);

      // Associate the square with $tile
      $tile.data(DATA_SQUARE, this);
      
      if (this.tileLocked) {
        if ($tile.hasClass("ui-draggable"))
          $tile.draggable("destroy");
        $tile
        .removeClass("unlocked-tile")
        .addClass("locked-tile");
      } else {
        // tile isn't locked, make it draggable
        $tile
        .removeClass("locked-tile")
        .addClass("unlocked-tile");
      }
    },

    /**
     * Remove the currently placed tile's UI from the square's UI.
     * @function
     * @instance
     * @memberof BrowserSquare
     * @param {Tile?} tile the tile being unplaced, if there is one. Normally
     * there will be, but if the square is being initialised as an empty
     * square, it won't.
     * @param {jQuery?} $td jquery object for the TD of the square. This
     * optional parameter is needed during initialisation, before the
     * square objects are added to the body.
     */
    $unplaceTile(tile, $td) {
      // Remove the tile UI (without deleting it)
      if (tile)
        tile.$div().detach();

      if (!$td) $td = $(`#${this.id}`);
      // Reinstate the droppable target, which was removed
      // in $placeTile (or not yet added)
      Platform.assert(!$td.hasClass("ui-droppable"));
      $td.droppable({
        hoverClass: "drop-active",
        drop: (event, jui) => {
          const from = $(jui.draggable).data(DATA_SQUARE);
          // Tell the main UI about it
          Platform.trigger("DropTile", [ from, this ]);
        }
      });
    },

    /**
     * Set the underlay
     * @function
     * @instance
     * @memberof BrowserSquare
     * @param {boolean} sel 
     */
    setUnderlay(ch) {
      this.underlay = ch;
    },

    /**
     * Set the square as (un)selected
     * @function
     * @instance
     * @memberof BrowserSquare
     * @param {boolean} sel 
     */
    setSelected(sel) {
      /* istanbul ignore if */
      if (sel && this.tile) {
        Platform.assert(!this.tileLocked, "Attempt to select locked tile");
        $(`#${this.id} .Tile`).addClass("selected");
      } else
        $(`#${this.id} .Tile`).removeClass("selected");
    }
  };

  return BrowserSquare;
});

