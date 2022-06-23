/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define("common/Platform", () => {

	/**
	 * Interface to the server-side games database to allow for
	 * plugging other database implementations.
	 */
	class Database {
    /* istanbul ignore next */
		/**
		 * @param {string} id a /-separated path name that will be used
		 * as the name of a DB. How this is interpreted is up to the
		 * implementation, but most will treat it as a directory or file path.
		 * @param {string} type identifier used to distinguish keys
		 * relevant to this DB from other data that may be co-located
		 * @abstract
		 */
		constructor(id, type) {}
		
    /* istanbul ignore next */
		/**
		 * Promise to get a list of keys in the DB
		 * @return {Promise} resolves to a `string[]` list of key names
		 * @abstract
		 */
		keys() {}

    /* istanbul ignore next */
		/**
		 * Promise to set a key value
		 * @param {string} key the entry key
		 * @param {object} data the data to store
		 * @return {Promise} resolves to undefined
		 * @abstract
		 */
		set(key, data) {}

    /* istanbul ignore next */
		/**
		 * Promise to get a key value
		 * @param {string} key the entry key
		 * @param {Object[]} classes list of classes that may occur in the
		 * data, as passed to {@linkcode Fridge#thaw|Fridge.thaw}
		 * @return {Promise} resolves to the key value
		 * @abstract
		 */
		get(key, classes) {}

    /* istanbul ignore next */
		/**
		 * Remove a key and all associated data
		 * @param {string} key the entry key
		 * @return {Promise} resolves to undefined
		 * @abstract
		 */
		rm(key) {}
	}

	/**
	 * Interface isolating platform details from the rest of
	 * the code. The purpose is to allow common code to run on
	 * both browser and server.
	 */
	class Platform {

		/* istanbul ignore next */
		/**
		 * Emit the given event for handling by the platform's event system
		 * @param {string} event name of event to emit
		 * @param {object[]} args array of arguments to pass to the
		 * event handler
		 * @abstract
		 */
		static trigger(event, args) {
			throw new Error("Pure virtual");
		}

		/**
		 * @callback Platform~bestMoveCallback
		 * @param {(Move|string)} best move found so far, or a
		 * progress string for debug (only intended for developer)
		 */

		/* istanbul ignore next */
		/**
		 * If available, find the best play. This is used to abstract
		 * the best play controller from the rest of the server code,
		 * so it can be invoked either directly or asynchronously.
		 * @param {Game} game the Game
		 * @param {Tile[]} rack rack in the form of a simple list of Tile
		 * @param {Platform~bestMoveCallback} cb accepts a best play
		 * whenever a new one is found, or a string containing a
		 * message
		 * @param {string?} dictpath path to dictionaries to override
		 * the default
		 * @param {string?} dictionary name of dictionary to override the
		 * game dictionary
		 * @return {Promise} Promise that resolves when all best moves
		 * have been tried
		 * @abstract
		 */
		static findBestPlay(game, rack, cb, dictpath, dictionary) {
			throw new Error("Pure virtual");
		}

		/* istanbul ignore next */
		/**
		 * Get the absolute path to a file or directory within the
		 * installation.
		 * @param {string} p a path relative to the root of the installation
		 * @abstract
		 */
		static getFilePath(p) {
			throw new Error("Pure virtual");
		}

		/* istanbul ignore next */
		/**
		 * Read a file
		 * @return {Promise} resolves to the file contents
		 * @abstract
		 */
		static readFile(path) {
			throw new Error("Pure virtual");
		}

		/* istanbul ignore next */
		/**
		 * Read a gz file
		 * @return {Promise} resolves to the file contents
		 * @abstract
		 */
		static readZip(path) {
			throw new Error("Pure virtual");
		}
	}

	/**
	 * Implementation of {@linkcode Database} for this platform
	 * @member {Database}
	 * @memberof Platform
	 */
	Platform.Database = Database;

	return Platform;
});
