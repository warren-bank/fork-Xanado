/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node */

define("server/DirtyDB", ["fs", "dirty", "events", "icebox"], (Fs, Dirty, Events, Icebox) => {

	/**
	 * Implementation of abstract DB interface. Uses dirty (from npm) as
	 * the database format (basically just JSON, and of dubious value) and 
	 * Icebox freeze/thaw.
	 */
	class DB extends Events.EventEmitter {
		/**
		 * @param path path to database on disc
		 * @param classes array of dependencies that when required
		 * return classes that are to be serialised
		 */
		constructor(path, classes) {
			super()
			this.prototypeMap = {};
			const db = this;
			requirejs(classes, function() {
				for (let clzz of arguments)
					db.prototypeMap[clzz.name] = clzz;
			});
			Events.EventEmitter.call(this);
			console.log('opening database', path);
			this.path = path;
			this.dirty = new Dirty(path);
			this.dirty.on('load', () => db.emit('load', 0));
		}

		// Get a value from the DB
		get(key) {
			return Icebox.thaw(this.dirty.get(key), this.prototypeMap);
		}

		// Set a new value in the DB for the data with the given key
		set(key, object) {
			this.dirty.set(key, Icebox.freeze(object));
		}

		all() {
			var retval = [];
			this.dirty.forEach((key, value) => {
				retval.push(value);
			});
			return retval;
		}

		snapshot() {
			let filename = `${this.path}.tmp`;
			if (Fs.existsSync(filename))
				throw Error(`snapshot cannot overwrite existing file ${filename}`);

			console.log(`Snapshot ${this.path}`);
			
			let snapshot = Dirty(filename);
			let db = this;
			snapshot.on('load', () => {
				db.dirty.forEach((key, value) => {
					snapshot.set(key, value);
				});
			});
			snapshot.on('drain', () => {
				Fs.renameSync(db.path, `${db.path}.old`);
				Fs.renameSync(filename, db.path);
				db.dirty = Dirty(db.path);
				console.log('DB snapshot finished');
			});
		}
	}

	return DB;
});
