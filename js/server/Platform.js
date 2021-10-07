/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node */

/**
 * This is the node.js implementation of game/Platform. There is an implementation
 * for the browser, too, in js/browser/Platform.js
 */
define('platform/Platform', [ 'events', 'fs-extra', 'node-gzip', 'game/Fridge', 'game/findBestPlayController', 'game/Platform' ], (Events, Fs, Gzip,Fridge, findBestPlay, Platform) => {

	const emitter = new Events.EventEmitter();

	/**
	 * Simple file database, where data is stored in files named the
	 * same as the key. There are some basic assumptions here:
	 * 1. Callers will filter the set of keys based on their requirements
	 * 2. Keys starting with . are forbidden
	 * 3. Key names must be valid file names
	 */
	class FileDatabase extends Platform.Database {

		// id will be used as the name of a directory under the requirejs root
		// to store game files in.
		constructor(id, type) {
			super(id, type);
			this.directory = requirejs.toUrl(id);
			this.type = type;
			this.re = new RegExp(`\\.${type}$`);
		}

		keys() {
			return Fs.readdir(this.directory)
			.then(list =>
				  list.filter(f => this.re.test(f))
				  .map(fn => fn.replace(this.re, '')));
		}

		set(key, data) {
			if (/^\./.test(key))
				throw Error(`Invalid DB key ${key}`);
			return Fs.writeFile(
				`${this.directory}/${key}.${this.type}`,
				JSON.stringify(Fridge.freeze(data)));
		}

		get(key, classes) {
			return Fs.readFile(`${this.directory}/${key}.${this.type}`)
			.then(data => Fridge.thaw(JSON.parse(data), classes));
		}

		rm(key) {
			return Fs.remove(`${this.directory}/${key}.${this.type}`);
		}
	}
	
	class ServerPlatform extends Platform {
		static trigger(e, args) {
			emitter.emit(e, args);
		}

		static getResource(path) {
			return Fs.readFile(path)
			.then(data => {
				// Is it a zip file? Header is 10 bytes
				// see https://tools.ietf.org/html/rfc1952.html
				if (data[0] === 0x1f
					&& data[1] === 0x8b // magic number
					&& data[2] === 0x08) { // DEFLATE
					// This is a far from thorough analysis of the header,
					// but given that the only binary files we deal with
					// are gzip format, it's going to work for us.
					return Gzip.ungzip(data);
				}
				return data;
			});
		}

		static findBestPlay() {
			return findBestPlay.apply(null, arguments);
		}
	}

	ServerPlatform.i18n = () => { return `FUCKITY ${arguments}`; };
	
    ServerPlatform.Database = FileDatabase;

	return ServerPlatform;
});
