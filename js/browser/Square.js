/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, browser, jquery */

define([ "platform" ], Platform => {

  /**
   * Browser functionality for Square
   * @mixin BrowserSquare
   */
  const BrowserSquare = {

    /**
     * Create the jquery representation
     * @param {string} base for id='s
     */
    $ui() {
      const $td = $(`<td></td>`);
      $td.addClass(`square-${this.type}`);
      const $div = $(`<div id="${this.id}"><a></a></div>`);
      // Associate the square with the div for dragging
      $div.data("square", this);
      $td.append($div);
      return $td;
    },

    $refresh() {
      const $div = $(`#${this.id}`);

      /* istanbul ignore if */
      if ($div.length === 0)
        // No visual representation for this square - for
        // example, might be a square in another player's rack
        return;

      $div.removeClass("selected")
      .removeClass("temporary")
      .off("click");

      if (this.tile)
        this.refreshOccupied($div);
      else
        this.refreshEmpty($div);
    },

    /**
     * Set the underlay; UI
     * @param {boolean} sel 
     */
    setUnderlay(ch) {
      this.underlay = ch;
    },

    /**
     * Set the square as (un)selected; UI
     * @param {boolean} sel 
     */
    setSelected(sel) {
      /* istanbul ignore if */
      if (sel && this.tile) {
        Platform.assert(!this.tileLocked, "Attempt to select locked tile");
        $(`#${this.id}`).addClass("selected");
      } else
        $(`#${this.id}`).removeClass("selected");
    },

    /**
     * Update a square that has a Tile dropped on it
     * @param {jQuery} $div the <div> for the square
     * @private
     */
    refreshOccupied($div) {
      if ($div.hasClass("ui-droppable"))
        /* istanbul ignore next */
        $div.droppable("destroy");

      $div
      .removeClass("empty-square")
      .addClass("tiled-square");

      if (this.tile.isBlank)
        $div.addClass("blank-letter");
      else
        $div.removeClass("blank-letter");

      if (this.tileLocked) {
        $div.addClass("Locked");
        if ($div.hasClass("ui-draggable"))
          /* istanbul ignore next */
          $div.draggable("destroy");
      } else {
        // tile isn't locked, valid drag source
        $div.removeClass("Locked");
        /* istanbul ignore next */
        $div
        .addClass("temporary")
        .on("click", () => Platform.trigger("SelectSquare", [ this ]));

        /* istanbul ignore next */
        $div.draggable({
          revert: "invalid",
          opacity: 1,
          helper: "clone",

          start: (event, jui) => {
            $div.css({ opacity: 0.5 });
            // Clear selection
            Platform.trigger("SelectSquare");
            // Configure drag helper
            $(jui.helper)
            .animate({"font-size" : "120%"}, 300)
            .addClass("drag-border");
          },

          drag: (event, jui) => $(jui.helper).addClass("drag-border"),

          stop: () => $div.css({ opacity: 1 })
        });
      }

      const letter = this.tile.letter;
      const score = this.tile.score;
      const $a = $("<a></a>");
      $a.append(`<span class="letter">${letter}</span>`);
      $a.append(`<span class="score">${score}</span>`);
      $div.empty().append($a);
    },

    /**
     * Update a square that doesn't have a Tile dropped on it
     * @param {jQuery} $div the <div> for the square
     * @private
     */
    refreshEmpty($div) {

      // Not draggable
      if ($div.hasClass("ui-draggable"))
        /* istanbul ignore next */
        $div.draggable("destroy");

      // no tile on the square, valid drop target
      $div
      .removeClass("tiled-square")
      .removeClass("blank-letter")
      .removeClass("Locked")
      .addClass("empty-square");

      /* istanbul ignore next */
      $div.on("click", () => Platform.trigger("SelectSquare", [ this ]))
      // Handle something dropping on us
      .droppable({
        hoverClass: "drop-active",
        drop: (event, jui) => {
          const source = $(jui.draggable).data("square");
          // Tell the main UI about it
          Platform.trigger("DropSquare", [ source, this ]);
        }
      });

      const text = Platform.i18n(`square-${this.type}`);
      $div.empty().append($("<a></a>").text(text));

      if (typeof this.underlay !== "undefined")
        $div.append(`<div class="underlay">${this.underlay}</div>`);
    }
  };

  return BrowserSquare;
});

