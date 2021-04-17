/* eslint-env browser, jquery */

/**
 * Browser implementation of Platform
 */
define("platform/Platform", () => {
	class Platform {
		static trigger(e, args) {
			return $(document).trigger(e, args);
		}

		static getResource(path) {
			return $.get(path);
		}
	}

	return Platform;
});
