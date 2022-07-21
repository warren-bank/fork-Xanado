/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

define(() => {

	/**
	 * Interface to a simple games database to allow for
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

  return Database;
});
