/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

define([
  "common/CBOREncoder", "common/CBORDecoder", "common/Tagger", "common/Database"
], (
  CBOREncoder, CBORDecoder, Tagger, Database
) => {

  const database = {};

  /**
   * Implementation of common/Database for use in tests. Data only persists
   * in memory.
   */
  class MemoryDatabase extends Database {

    constructor() {
      super();
      const tagger = new Tagger();
      this.encoder = new CBOREncoder(tagger);
    }

    keys() {
      return Object.keys(database);
    }

    set(key, data) {
      database[key] = this.encoder.encode(data);
      return Promise.resolve();
    }

    get(key, classes) {
      const decoder = new CBORDecoder(new Tagger(classes));
      return Promise.resolve(decoder.decode(database[key]));
    }

    rm(key) {
      delete database[key];
      return Promise.resolve();
    }
  }

  return MemoryDatabase;
});
