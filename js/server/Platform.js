/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node */

/**
 * node.js implementation of Platform
 */
define("platform/Platform", ["events", "fs-extra", "node-gzip", "game/Fridge"],  (Events, Fs, Gzip, Fridge) => {

	const emitter = new Events.EventEmitter();

	/**
	 * Simple file database, where data is stored in files named the
	 * same as the key. There are some basic assumptions here:
	 * 1. Callers will filter the set of keys based on their requirements
	 * 2. Keys starting with . are forbidden
	 * 3. Key names must be valid file names
	 */
	class Database {
		/**
		 * @param id will be used as the name of a directory under the
		 * requirejs root
		 * @param type identifier used to distinguish keys relevant to this
		 * DB from other data that may be co-located
		 */
		constructor(id, type) {
			this.directory = requirejs.toUrl(id);
			this.type = type;
			this.re = new RegExp(`\\.${type}$`);
		}

		/**
		 * Promise to get a list of keys in the DB
		 */
		keys() {
			return Fs.readdir(this.directory)
			.then(list =>
				  list.filter(f => this.re.test(f))
				  .map(fn => fn.replace(this.re, "")));
		}

		/**
		 * Promise to set a key value
		 * @param key the entry key
		 * @param data the data to store
		 */
		set(key, data) {
		
			if (/^\./.test(key))
				throw Error(`Invalid DB key ${key}`);
			return Fs.writeFile(
				`${this.directory}/${key}.${this.type}`,
				JSON.stringify(Fridge.freeze(data)));
		}

		/**
		 * Promise to get a key value
		 * @param key the entry key
		 * @param classes list of classes passed to Fridge.thaw
		 */
		get(key, classes) {
			return Fs.readFile(`${this.directory}/${key}.${this.type}`)
			.then(data => Fridge.thaw(JSON.parse(data), classes));
		}

		rm(key) {
			return Fs.unlink(`${this.directory}/${key}.${this/type}`,
							 { force: true })
		}
	}
	
	class Platform {
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
	}

	Platform.Database = Database;

	return Platform;
});
