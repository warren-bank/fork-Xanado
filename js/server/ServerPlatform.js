/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env node */

/**
 * This is the node.js implementation of common/Platform. There is an
 * implementation for the browser, too, in js/browser/Platform.js
 */
define("platform", [
	"events", "fs", "proper-lockfile", "node-gzip", "get-user-locale", "path",
	"common/Platform", "common/Fridge"
], (
	Events, fs, Lock, Gzip, Locale, Path,
	Platform, Fridge
) => {

	const Fs = fs.promises;
	const emitter = new Events.EventEmitter();

	/**
	 * Simple file database implementing {@link Database} for use
	 * server-side, where data is stored in files named the same as
	 * the key. There are some basic assumptions here:
	 * 1. Callers will filter the set of keys based on their requirements
	 * 2. Keys starting with . are forbidden
	 * 3. Key names must be valid file names
 	 */
	class FileDatabase extends Platform.Database {

		/**
		 * @param {string} path name of a pre-existing
		 * directory to store games in. 
		 * @param {string} type will be used as the extension on file names
		 */
		constructor(path, type) {
			super(path, type);
			this.directory = path;
			this.type = type;
			this.re = new RegExp(`\\.${type}$`);
			this.locks = {};
		}

		/** See {@link Database#keys} for documentation */
		keys() {
			return Fs.readdir(this.directory)
			.then(list =>
				  list.filter(f => this.re.test(f))
				  .map(fn => fn.replace(this.re, "")));
		}

		/** See {@link Database#set} for documentation */
		set(key, data) {
			if (/^\./.test(key))
				throw Error(`Invalid DB key ${key}`);
			const fn = Path.join(this.directory, `${key}.${this.type}`);
			const s = JSON.stringify(Fridge.freeze(data), null, 1);
			return Fs.access(fn)
			.then(acc => {
				return Lock.lock(fn) // file exists
				.then(release => Fs.writeFile(fn, s)
					  .then(() => release()));
			})
			.catch(e => Fs.writeFile(fn, s)); // file does not exist
		}

		/** See {@link Database#get} for documentation */
		get(key, classes) {
			const fn = Path.join(this.directory, `${key}.${this.type}`);

			/* Locking doesn't work cleanly; locks are often left dangling,
			   despite our releasing them religiously.

			return Lock.lock(fn)
			.then(release => Fs.readFile(fn)
				  .then(data => release()
						.then(() => {
							console.debug(`Unlocked ${fn}`);
							return Fridge.thaw(JSON.parse(data), classes);
							})));
            */
			return Fs.readFile(fn)
			.then(data => {
				return Fridge.thaw(JSON.parse(data), classes);
			});
		}

		/** See {@link Database#rm} for documentation */
		rm(key) {
			return Fs.unlink(Path.join(this.directory, `${key}.${this.type}`));
		}
	}

    /**
	 * Partial implementation of jquery i18n to support server-side
	 * string translations using the same data files as browser-side.
	 * Language files will be located by looking up the path for
	 * `./i18n/en.json`
	 */
	let I18N_data;
	
	// Recurse up the path to find the i18n directory,
	// identified by the end path i18n/en.json
	function findLangPath(path) {
		const f = Path.join(path, "i18n", "en.json");
		return Fs.stat(f)
		.then(() => path)
		.catch(e => {
			if (path.length === 0)
				return undefined;
			return findLangPath(Path.dirname(path));
		});
	}

	function I18N() {
		if (arguments.length === 0) {
			return {
				load: locale => {
					// process.argv[1] has the path to server.js
					// LANG_SEARCH_BASE lets us override it in unit tests
					let langdir, langfile;
					return findLangPath(
						ServerPlatform.LANG_SEARCH_BASE || process.argv[1],
						locale)
					.then(path => langdir = Path.join(path, "i18n"))
					.then(() => {
						langdir = Path.join(langdir, `${locale}/json`);
						// Try the full locale e.g. "en-US"
						return Fs.readFile(langfile);
					})
					.catch(e => {
						// Try the first part of the locale i.e. "en"
						// from "en-US"
						langfile = Path.join(langdir,
											 `${this.lang.split("-")[0]}.json`);
						return Fs.readFile(langfile);
					})
					.catch(e => {
						// Fall back to "en"
						langfile = Path.join(langdir, "en.json");
						return Fs.readFile(langfile);
					})
					.then(buffer => {
						I18N_data = JSON.parse(buffer.toString());
					});
				}
			};
		} else {
			let s = arguments[0];
			if (I18N_data && typeof I18N_data[s] !== "undefined")
				s = I18N_data[s];
			// TODO: support PLURAL
			return s.replace(
				/\$(\d+)/g,
				(m, index) => arguments[index]);
		}
	}

	let findBestPlayController;

	/**
	 * Implementation of {@link Platform} for use in node.js.
	 * See a{@link FileDatabase} of the `Platform.Database` implementation,
	 * and {@link I18N} for the `Platform.i18n` implementation.
	 * {@link module:game/findBestPlay} is used to implement `findBestPlay`.
	 * @implements Platform
	 */
	class ServerPlatform extends Platform {
		/** See {@link Platform#trigger} for documentation */
		static trigger(e, args) {
			emitter.emit(e, args);
		}

		/** See {@link Platform#findBestPlay} for documentation */
		static findBestPlay() {
			// block this thread
			// return Game.findBestPlay.apply(arguments)

			// OR

			// use a worker thread
			return findBestPlayController.apply(null, arguments);
		}

		static readFile(p) {
			return Fs.readFile(p);
		}

		static readZip(p) {
			return Fs.readFile(p)
			.then(data => Gzip.ungzip(data));
		}
	}
	
    ServerPlatform.Database = FileDatabase;

	ServerPlatform.i18n = I18N;

	// Asynchronous load to break circular dependency
	requirejs(["game/findBestPlayController"], mod => findBestPlayController = mod);

	return ServerPlatform;
});
