/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, browser, jquery */

define([ "jquery" ], () => {

  /**
   * Browser-side base class for {@linkcode Surface}
   */
  class BrowserSurface {
    /**
     * Create the UI representation
     * @function
     * @instance
     * @memberof BrowserSurface
     * @param {jQuery} $table table to populate
     */
    $populate($table) {
      const $tbody = $(document.createElement("tbody"));
      $table.append($tbody);
      for (let row = 0; row < this.rows; row++) {
        const $tr = $(document.createElement("tr"));
        $tbody.append($tr);
        for (let col = 0; col < this.cols; col++) {
          const square = this.at(col, row);
          const $td = $(document.createElement("td"));
          $tr.append($td);
          square.$populate($td);
        }
      }
    }
  }

  return BrowserSurface;
});
