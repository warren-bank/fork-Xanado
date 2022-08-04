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
     * @param {jQuery} $table table to populate
     */
    $populate($table) {
      const $tbody = $("<tbody></tbody>");
      $table.append($tbody);
      const $tr = $("<tr></tr>");
      $tbody.append($tr);
      this.forEachSquare(square => {
        const $td = $("<td></td>");
        $tr.append($td);
        square.$populate($td);
        return false;
      });
    }
  };

  return BrowserRack;
});
