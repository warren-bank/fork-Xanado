/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

define("platform", [ "common/Platform" ], Platform => {

	/**
	 * Browser implementation of {@linkcode Platform}
	 * for the abstract base class.  Note there is no Platform.Database
	 * implementation for the browser.
	 */
	class BrowserPlatform extends Platform {
		/** See {@linkcode Platform#trigger|Platform.trigger} for documentation */
		static trigger(e, args) {
			// Pass events straight to the document
			return $(document).trigger(e, args);
		}

		static i18n() {
			return $.i18n.apply($.i18n, arguments);
		}
	}

	return BrowserPlatform;
});
