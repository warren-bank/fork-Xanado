/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define(() => {

  /**
   * Interface isolating platform details from the rest of
   * the code. The purpose is to allow common code to run on
   * both browser and server.
   */
  class Platform {

    /* istanbul ignore next */
    /**
     * Platform-specific assert
     * @param {boolean} condition must be true or will throw an Error
     * @param {string} descr Error description
     */
    static assert(condition, descr) {}

    /* istanbul ignore next */
    /**
     * assert(false)
     * @param {string} descr Error description
     */
    static fail(descr) {}

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

  return Platform;
});
