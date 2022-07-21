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
	 * {@linkcode module:game/findBestPlay} is used to implement `findBestPlay`.
	 * @implements Platform
	 */
	class ServerPlatform extends Platform {
    static Database = FileDatabase;
	  static i18n = I18N;

		/* @override */
	  static assert = Assert;

		/* @override */
		static trigger(e, args) {
			emitter.emit(e, args);
		}

    /* istanbul ignore next */
		/* @override */
    static fail(descr) {
      Assert(false, descr);
    }

		/* @override */
		static async findBestPlay() {
			// game/findBestPlay to block
			// game/findBestPlayController to use a worker thread
			return new Promise(
        resolve => requirejs([ "game/findBestPlayController" ],
                             fn => resolve(fn.apply(null, arguments))));
		}

		/* @override */
		static getFilePath(p) {
			return Path.normalize(requirejs.toUrl(p || ""));
		}

		/* @override */
		static readFile(p) {
			return Fs.readFile(p);
		}

		/* @override */
		static readZip(p) {
			return Fs.readFile(p)
			.then(data => Gzip.ungzip(data));
		}
	}

	return ServerPlatform;
});

