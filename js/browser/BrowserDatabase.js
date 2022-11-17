/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

/**
 * This is the browser implementation of common/Database.
 */
define([
  "common/Fridge", "common/Database"
], (
  Fridge, Database
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
        JSON.stringify(Fridge.freeze(data), null, 1));
      return Promise.resolve();
    }

    get(key, typeMap) {
      const data = localStorage.getItem(`xanado_${key}`);
      if (data === null)
        return Promise.reject(`"${key}" was not found`);
      return Promise.resolve(Fridge.thaw(JSON.parse(data), typeMap));
    }

    rm(key) {
      localStorage.removeItem(`xanado_${key}`);
      return Promise.resolve();
    }
  }

  return BrowserDatabase;
});
