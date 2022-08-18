/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, browser, jquery */

define(() => {

  /**
   * Browser-side mixin for {@linkcode Move}
   * @mixin BrowserMove
   */
  class BrowserMove {
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
      const $span = $('<span class="turn-score"></span>');
      for (let word of this.words) {
        $span
        .append($('<span class="word"></span>')
                .append(word.word));
        /* istanbul ignore else */
        if (!hideScore) {
          $span
          .append($(`<span class="word-score"></span>`)
                  .append(`(${word.score})`));
        }
        sum += word.score;
      }
      // .score will always be a number after a move
      /* istanbul ignore else */
      if (!hideScore && this.words.length > 1 || this.score > sum) {
        $span
        .append($(`<span class="turn-total"></span>`)
                .append($.i18n("play-score", this.score)));
      }
      return $span;
    }
  }

  return BrowserMove;
});
