/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env browser, jquery */

/**
 * Browser implementation of game/Platform. See js/game/Platform.js
 * for the abstract base class.  Note there is no Platform.Database
 * implementation for the browser.
 */
define('platform/Platform', [ "game/Platform" ], (Platform) => {

	class BrowserPlatform extends Platform {
		static trigger(e, args) {
			// Pass events straight to the document
			return $(document).trigger(e, args);
		}

		static getResource(path) {
			return $.get(path);
		}

		static findBestPlay() {
			// NOP, not available in browser
		}
	}

	BrowserPlatform.i18n = $.i18n;

	return BrowserPlatform;
});
