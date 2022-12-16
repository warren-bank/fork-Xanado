/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

global.assert = require("assert");
const Fs = require("fs").promises;
const Path = require("path");
const Lock = require("proper-lockfile");

define([
  "js/common/Platform",
  "js/server/I18N"
], (
  Platform,
  I18N
) => {

  /**
   * Implementation of {@linkcode common/Platform} for use in node.js.
   * @implements Platform
   */
  class ServerPlatform extends Platform {
    static i18n = I18N;

    /**
     * @implements Platform
     */
    static trigger(e, args) {
      assert.fail("ServerPlatform.trigger");
    }

    /**
     * @implements Platform
     */
    static async findBestPlay() {
      // backend/findBestPlay to block
      // backend/findBestPlayController to use a worker thread
      return new Promise(
        resolve => requirejs([ "js/backend/findBestPlayController" ],
                             fn => resolve(fn.apply(null, arguments))));
    }

    /**
     * @implements Platform
     */
    static parsePath(p) {
      return Path.parse(p);
    }

    /**
     * @implements Platform
     */
    static formatPath(p) {
      return Path.format(p);
    }

    /**
     * @implements Platform
     */
    static getFilePath(p) {
      return Path.normalize(requirejs.toUrl(p || ""));
    }

    /**
     * @implements Platform
     */
    static readFile(p) {
      return Fs.readFile(p);
    }

    /**
     * @implements Platform
     */
    static readBinaryFile(p) {
      return Fs.readFile(p);
    }
  }

  return ServerPlatform;
});

