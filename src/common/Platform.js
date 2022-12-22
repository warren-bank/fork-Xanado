/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

/**
 * Interface isolating platform details from the rest of
 * the code. The purpose is to allow common code to run on
 * both browser and server.
 * @interface
 */
class Platform {

  /* istanbul ignore next */
  /**
   * Make a loud noise about a failure and throw a suitable error.
   * @param {string} descr Error description
   * @throws {Error}
   */
  static fail(descr) {
    throw Error(`Platform.fail ${descr}`);
  }

  /* istanbul ignore next */
  /**
   * Emit the given event for handling by the platform's event system
   * @param {string} event name of event to emit
   * @param {object[]} args array of arguments to pass to the
   * event handler
   * @abstract
   */
  static trigger(event, args) {
    throw Error(`Platform.trigger ${event} ${args}`);
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
   * @param {string?} dictionary name of (or path to) dictionary to
   * override the game dictionary
   * @return {Promise} Promise that resolves when all best moves
   * have been tried
   * @abstract
   */
  static findBestPlay(game, rack, cb, dictionary) {
    throw Error(`Platform.findBestPlay ${game} ${rack} ${cb} ${dictionary}`);
  }

  /* istanbul ignore next */
  /**
   * Signature as {@link https://nodejs.org/api/path.html#pathformatpathobject|path.parse}
   * @param {string} p a path to split
   * @return {object}
   * @abstract
   */
  static parsePath(p) {
    throw Error(`Platform.parsePath ${p}`);
  }

  /* istanbul ignore next */
  /**
   * Signature as {@link https://nodejs.org/api/path.html#pathformatpathobject|path.format}
   * @param {object} p a path object
   * @return {string}
   * @abstract
   */
  static formatPath(p) {
    throw Error(`Platform.formatPath ${p}`);
  }

  /* istanbul ignore next */
  /**
   * Get the absolute path to a file or directory within the
   * installation. This can be a file path or a URL path, depending
   * on the context.
   * @param {string} p a path relative to the root of the installation
   * @abstract
   */
  static getFilePath(p) {
    throw Error(`Platform.getFilePath ${p}`);
  }

  /* istanbul ignore next */
  /**
   * Read a file. This automatically parses .json files.
   * @return {Promise} resolves to the file contents.
   * @abstract
   */
  static readFile(path) {
    throw Error(`Platform.readFile ${path}`);
  }

  /* istanbul ignore next */
  /**
   * Read a binary file
   * @return {Promise} resolves to the file contents (a Buffer)
   * @abstract
   */
  static readBinaryFile(path) {
    throw Error(`Platform.readBinaryFile ${path}`);
  }
}

export { Platform }
