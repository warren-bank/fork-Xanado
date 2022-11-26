/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

const Fs = require("fs").promises;
const Path = require("path");

/**
 * Index a single directory.
 * @param {string} dir path to directory
 * @param {function} filt filter function to select files in the directory
 * for inclusion in the index
 * @param {RegExp?} rip optional regular expression that rips off any
 * unwanted part of the filename (e.g. extension)
 * @return {Promise} promise that resolves to undefined
 */
function index(dir, filt, rip) {
  return Fs.readdir(dir)
  .then(files => files.filter(f => filt(Path.resolve(dir, f))))
  .then(list => rip ? list.map(f => f.replace(rip, "")) : list)
  .then(list => {
    console.debug(`Writing ${dir}/index.json`);
    return Fs.writeFile(`${dir}/index.json`, JSON.stringify(list));
  });
}

/**
 * Update index.json files in the css, i18n, editions and dictionaries
 * directories. These files are required on simple http servers that
 * don't support server-side scripting (i.e. when the Xanado code is running
 * "standalone"
 * @param {string} root path to root directory for project
 * @return {Promise} promise that resolves to undefined
 */
module.exports = (root) => {
  console.debug("Building index.json files for directories");
  console.debug("These files are used by the standalone version");
  return Promise.all([
    index(Path.resolve(root, "css"),
          f => /^[^.]+$/i.test(f)),
    index(Path.resolve(root, "i18n"),
          f => !/(^|\W)(index|qqq)\.json$/.test(f)
          && /\.json$/.test(f),
          /\.json?$/),
    index(Path.resolve(root, "editions"),
          f => /[A-Z].*\.js$/.test(f),
          /\.js$/),
    index(Path.resolve(root, "dictionaries"),
          f => /\.dict$/.test(f),
          /\.dict$/)
  ]);
};


