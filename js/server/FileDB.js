/* eslint-env node */

define("server/FileDB", ["fs", "dirty", "events", "icebox"], (Fs, Dirty, Events, Icebox) => {

	/**
	 * Implementation of abstract DB interface using Icebox freeze/thaw to a file
	 */
	class DB extends Events.EventEmitter {
		constructor(path) {
			super()
			this.prototypeMap = {};
			Events.EventEmitter.call(this);
			console.log('opening database', path);
			this.path = path;
			this.dirty = Dirty(path);
			var db = this;
			this.dirty.on('load', function () { db.emit('load', 0); });
		}

		registerObject(constructor) {
			this.prototypeMap[constructor.name] = constructor;
		}

		// Get a new value in the DB for the data with the given key
		// This is usually a game key
		get(key) {
			return Icebox.thaw(this.dirty.get(key), this.prototypeMap);
		}

		// Set a new value in the DB for the data with the given key
		// This is usually a game key
		set(key, object) {
			this.dirty.set(key, Icebox.freeze(object));
		}

		all() {
			var retval = [];
			this.dirty.forEach(function(key, value) {
				retval.push(value);
			});
			return retval;
		}

		snapshot() {
			let db = this;
			let filename = this.path + '.tmp';
			if (Fs.existsSync(filename)) {
				throw 'snapshot cannot overwrite existing file ' + filename;
			}
			let snapshot = Dirty(filename);
			snapshot.on('load', function() {
				db.dirty.forEach(function(key, value) {
					snapshot.set(key, value);
				});
			});
			snapshot.on('drain', function() {
				Fs.renameSync(db.path, db.path + '.old');
				Fs.renameSync(filename, db.path);
				db.dirty = Dirty(db.path);
				console.log('DB snapshot finished');
			});
		}
	}

	return DB;
});
