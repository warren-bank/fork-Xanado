/* eslint-env browser, jquery */

/**
 * Browser implementation of Platform
 */
define('platform/Platform', () => {
	class Platform {
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

	return Platform;
});
