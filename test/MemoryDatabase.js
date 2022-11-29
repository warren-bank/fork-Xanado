/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

define([
  "common/Fridge", "common/Database"
], (
  Fridge, Database
) => {

  const database = {};

  /**
   * Implementation of common/Database for use in tests. Data only persists
   * in memory.
   */
  class MemoryDatabase extends Database {

    keys() {
      return Object.keys(database);
    }

    set(key, data) {
      database[key] = Fridge.freeze(data);
      return Promise.resolve();
    }

    get(key, classes) {
      return Promise.resolve(Fridge.thaw(database[key], classes));
    }

    rm(key) {
      delete database[key];
      return Promise.resolve();
    }
  }

  return MemoryDatabase;
});
