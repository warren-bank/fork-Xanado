/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, browser, jquery */

define(() => {

  /**
   * Browser-side mixin for {@linkcode Rack}
   * @mixin BrowserRack
   */
  const BrowserRack = {
    /**
     * Create the jquery representation for the Rack.
     * @function
     * @instance
     * @memberof BrowserRack
     * @param {string} underlay a string of letters to use as background of
     * the rack squares.
     * @return {jQuery}
     */
    $ui(underlay) {
      const $table = $('<table class="rack"></table>');
      const $tbody = $("<tbody></tbody>");
      $table.append($tbody);
      const $tr = $(`<tr></tr>`);
      let idx = 0;
      this.forEachSquare(square => {
        const $td = square.$ui(idx);
        $tr.append($td);
        idx++;
      });
      $tbody.append($tr);
      return $table;
    }
  };

  return BrowserRack;
});
