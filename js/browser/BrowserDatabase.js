/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

/**
 * This is the browser implementation of common/Database.
 */
define([
  "js/common/Database", "js/common/Utils"
], (
  Database, Utils
) => {

  /* global localStorage */

  /**
   * Simple implemention of {@linkcode Database} for use
   * in the browser, using localStorage.
   * @implements Database
    */
  class BrowserDatabase extends Database {

    keys() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        let m;
        if ((m = /^xanado_(.*)$/.exec(key)))
            keys.push(m[1]);
      }
      return Promise.resolve(keys);
    }

    set(key, data) {
      localStorage.setItem(
        `xanado_${key}`,
        Utils.Uint8ArrayToBase64(data));
      return Promise.resolve();
    }

    get(key) {
      const data = localStorage.getItem(`xanado_${key}`);
      if (data === null)
        return Promise.reject(`"${key}" was not found`);
      try {
        return Promise.resolve(Utils.Base64ToUint8Array(data));
      } catch (e) {
        return Promise.reject(e);
      }
    }

    rm(key) {
      localStorage.removeItem(`xanado_${key}`);
      return Promise.resolve();
    }
  }

  return BrowserDatabase;
});
