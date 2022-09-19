/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

/**
 * This is the node.js implementation of common/Database.
 */
define([
  "assert", "fs", "path",
  "proper-lockfile", "node-gzip",
  "common/Fridge", "common/Database"
], (
  Assert, fs, Path,
  Lock, Gzip,
  Fridge, Database
) => {
  const Fs = fs.promises;

  /**
   * Simple file database implementing {@linkcode Database} for use
   * server-side, where data is stored in files named the same as
   * the key. There are some basic assumptions here:
   * 1. Callers will filter the set of keys based on their requirements
   * 2. Keys starting with . are forbidden
   * 3. Key names must be valid file names
    */
  class FileDatabase extends Database {

    /**
     * @param {string} path name of a pre-existing
     * directory to store games in, relative to requirejs.toUrl.
     * @param {string} type will be used as the extension on file names
     */
    constructor(path, type) {
      super(path, type);
      this.directory = Path.normalize(requirejs.toUrl(path || ""));
      this.type = type;
      this.re = new RegExp(`\\.${type}$`);
      this.locks = {};
    }

    /** See {@linkcode Database#keys|Database.keys} for documentation */
    keys() {
      return Fs.readdir(this.directory)
      .then(list =>
            list.filter(f => this.re.test(f))
            .map(fn => fn.replace(this.re, "")));
    }

    /** See {@linkcode Database#set|Database.set} for documentation */
    set(key, data) {
      Assert(!/^\./.test(key));
      const fn = Path.join(this.directory, `${key}.${this.type}`);
      const s = JSON.stringify(Fridge.freeze(data), null, 1);
      //console.log("Writing", fn);
      return Fs.access(fn)
      .then(acc => { // file exists
        return Lock.lock(fn)
        .then(release => Fs.writeFile(fn, s)
              .then(() => release()));
      })
      .catch(e => Fs.writeFile(fn, s)); // file does not exist
    }

    /** See {@linkcode Database#get|Database.get} for documentation */
    get(key, classes) {
      const fn = Path.join(this.directory, `${key}.${this.type}`);

      return Lock.lock(fn)
      .catch(e => {
        console.error("LOCK FAILURE", key, e);
        return Promise.resolve();
      })
      .then(release => {
        return Fs.readFile(fn)
        .then(data => {
          if (typeof release === "function")
            release();
          return Fridge.thaw(JSON.parse(data.toString()), classes);
        })
        .catch(e => {
          if (typeof release === "function")
            release();
          throw Error(`Error reading ${fn}: ${e}`);
        });
      });
    }

    /** See {@linkcode Database#rm|Database.rm} for documentation */
    rm(key) {
      return Fs.unlink(Path.join(this.directory, `${key}.${this.type}`));
    }
  }

  return FileDatabase;
});

