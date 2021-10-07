/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

/**
 * The Platform class is a pure abstraction isolating platform details from the
 * rest of the code. The main purpose is to allow common code to run on both
 * browser and server, but it also provides an abstraction of the server-side
 * database (unused on the browser).
 */
define('game/Platform', () => {

	/**
	 * Abstraction of the database used to store game information.
	 */
	class Database {
		/**
		 * @param id will be used as the name of a directory under the
		 * requirejs root
		 * @param type identifier used to distinguish keys relevant to this
		 * DB from other data that may be co-located
		 */
		constructor(id, type) {}
		
		/**
		 * Promise to get a list of keys in the DB
		 * @return {Promise} resolves to a list of key names
		 */
		keys() {}

		/**
		 * Promise to set a key value
		 * @param key the entry key
		 * @param data the data to store
		 * @return {Promise} resolves to undefined
		 */
		set(key, data) {}

		/**
		 * Promise to get a key value
		 * @param key the entry key
		 * @param classes list of classes passed to Fridge.thaw
		 * @return {Promise} resolves to the key value
		 */
		get(key, classes) {}

		/**
		 * Remove a key and all associated data
		 * @return {Promise} resolves to undefined
		 */
		rm(key) {}
	}

	/**
	 * Abstraction of platform features
	 */
	class Platform {
		/**
		 * Emit the given event for handling by the platform's event system
		 * @param event name of event to emit
		 * @param args array of arguments to pass to the event handler
		 */
		static trigger(event, args) {}

		/**
		 * Get the given file resource.
		 * @param path the path to the resource, relative to the resource root
		 * (the html root on a browser, or the file system on server) 
		 */
		static getResource(path) {}

		/**
		 * If available, find the best play. This is used to abstract the best play
		 * controller from the rest of the server code, so it can be invoked either
		 * directly or asynchronously. It should be a NOP on a browser.
		 * @return {Promise} resolves when all best moves have been tried
		 */
		static findBestPlay() {}

		/**
		 * Platform-independent interface to i18n translation.
		 * This is modelled on jQuery i18n, so you can simply use
		 * Platform.i18n in the same way as you'd used $.i18n
		 */
		static i18n() {}
	}

	Platform.Database = Database;
	return Platform;
});
