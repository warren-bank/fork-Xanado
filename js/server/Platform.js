/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

/**
 * This is the node.js implementation of common/Platform. There is an
 * implementation for the browser, too, in js/browser/Platform.js
 */
define([
	"assert", "fs", "path",
  "events", "proper-lockfile", "node-gzip", "get-user-locale",
	"common/Fridge", "common/Platform",
  "server/I18N", "server/FileDatabase"
], (
	Assert, fs, Path,
  Events, Lock, Gzip, Locale,
	Fridge, Platform,
  I18N, FileDatabase
) => {
	const Fs = fs.promises;
	const emitter = new Events.EventEmitter();

	/**
	 * Implementation of {@linkcode Platform} for use in node.js.
	 * See {@linkcode FileDatabase} of the `Platform.Database` implementation,
	 * and {@linkcode I18N} for the `Platform.i18n` implementation.
	 * {@linkcode module:game/findBestPlay} is used to implement `findBestPlay`.
	 * @implements Platform
	 */
	class ServerPlatform extends Platform {
	  static assert = Assert;
    static Database = FileDatabase;
	  static i18n = I18N;

		/** See {@linkcode Platform#trigger|Platform.trigger} for documentation */
		static trigger(e, args) {
			emitter.emit(e, args);
		}

    /* istanbul ignore next */
		/** See {@linkcode Platform#fail|Platform.fail} for documentation */
    static fail(descr) {
      Assert(false, descr);
    }

		/** See {@linkcode Platform#findBestPlay|Platform.findBestPlay} for documentation */
		static async findBestPlay() {
			if (global.SYNC_FBP) { // used for debug
			  // block this thread
        /* istanbul ignore next */
			  const fn = await new Promise(
          resolve => requirejs([ "game/findBestPlay" ], resolve(fn)));
        return fn.apply(null, arguments);
      }
      else {
			  // use a worker thread
			  return new Promise(
          resolve => requirejs([ "game/findBestPlayController" ],
                               fn => resolve(fn.apply(null, arguments))));
      }
		}

		/** See {@linkcode Platform#getFilePath|Platform.getFilePath} for documentation */
		static getFilePath(p) {
			return Path.normalize(requirejs.toUrl(p || ""));
		}

		/** See {@linkcode Platform#readFile|Platform.readFile} for documentation */
		static readFile(p) {
			return Fs.readFile(p);
		}

		/** See {@linkcode Platform#readZip|Platform.readZip} for documentation */
		static readZip(p) {
			return Fs.readFile(p)
			.then(data => Gzip.ungzip(data));
		}
	}

	return ServerPlatform;
});

