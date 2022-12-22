/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

/**
 * Interface to a simple games database to allow for
 * plugging other database implementations. In the interests of
 * simplicity and portability:
 * 1. Keys starting with . are forbidden
 * 2. Key names must be valid file names
 * 3. null is not a valid item value
 * @interface
 */
class Database {

  /* istanbul ignore next */
  /**
   * Promise to get a list of keys in the DB
   * @return {Promise} resolves to a `string[]` list of key names
   */
  keys() {}

  /* istanbul ignore next */
  /**
   * Promise to set a key value
   * @param {string} key the entry key
   * @param {object} data the data to store
   * @return {Promise} resolves to undefined
   */
  set(key, data) { assert.fail(`Database.set ${key} ${data}`); }

  /* istanbul ignore next */
  /**
   * Promise to get a key value
   * @param {string} key the entry key
   * @return {Promise} resolves to the key value
   */
  get(key) { assert.fail(`Database.get ${key}`); }

  /* istanbul ignore next */
  /**
   * Remove a key and all associated data
   * @param {string} key the entry key
   * @return {Promise} resolves to undefined
   */
  rm(key) { assert.fail(`Database.rm ${key}`); }
}

export { Database }
