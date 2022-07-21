/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

define([ "common/Platform" ], Platform => {

  /**
   * Browser implementation of {@linkcode Platform}
   * for the abstract base class.
   * implementation for the browser.
   */
  class BrowserPlatform extends Platform {

    /** See {@linkcode Platform#trigger|Platform.trigger} for documentation */
    static trigger(e, args) {
      // Pass events straight to the document
      return $(document).trigger(e, args);
    }

    static assert(cond, desc) {
      if (!cond)
        BrowserPlatform.fail(desc);
    }

    static fail(desc) {
      alert(desc + "\nPlease report this to the developers, including the console log in your report\nan" + new Error(desc).stack);
        throw new Error(desc || "Internal error");
    }

    static i18n() {
      return $.i18n.apply($.i18n, arguments);
    }

    /** See {@linkcode Platform#getFilePath|Platform.getFilePath} for documentation */
    static getFilePath(p) {
      return requirejs.toUrl(p || "");
    }

    /** See {@linkcode Platform#readFile|Platform.readFile} for documentation */
    static readFile(p) {
      return $.get(p);
    }

    /** See {@linkcode Platform#readZip|Platform.readZip} for documentation */
    static readZip(p) {
      return $.get(p);
    }
  }

  return BrowserPlatform;
});
