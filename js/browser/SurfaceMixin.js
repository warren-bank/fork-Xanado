/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, browser, jquery */

define([ "jquery" ], () => {

  /**
   * Browser-side mixin for {@linkcode Surface}
   * @mixin browser/SurfaceMixin
   */
  return superclass => class SurfaceMixin extends superclass {

    /**
     * @see Fridge
     */
    static UNFREEZABLE = true;

    /**
     * Create the UI representation
     * @instance
     * @memberof browser/SurfaceMixin
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
  };
});
