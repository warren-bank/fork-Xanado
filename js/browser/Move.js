/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, browser, jquery */

define(() => {

  /**
   * Browser-side mixin for {@linkcode Move}
   * @mixin BrowserMove
   */
  const BrowserMove = {
    /**
     * Format a score summary.
     * @function
     * @instance
     * @memberof BrowserMove
     * @param {boolean} hideScore true to elide the score
     * @return {jQuery} the span containing the score
     */
    $score(hideScore) {
      // Could be static
      let sum = 0;
      const $span = $("<span></span>");
      for (let word of this.words) {
        $span
        .append(` <span class="word">${word.word}</span>`);
        if (!hideScore) {
          $span
          .append(` (<span class="word-score">${word.score}</span>)`);
        }
        sum += word.score;
      }
      // .score will always be a number after a move
      if (!hideScore && this.words.length > 1 || this.score > sum) {
        $span
        .append(" ")
        .append($.i18n("total $1", this.score));
      }
      return $span;
    }
  };

  return BrowserMove;
});
