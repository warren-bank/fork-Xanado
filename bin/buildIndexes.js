/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

/**
 * Build infdex files for selected dirs
 */
const requirejs = require("requirejs");

requirejs.config({
  baseUrl: `${__dirname}/..`,
  nodeRequire: require
});

const readline = require('readline/promises');

requirejs([
  "fs", "path"
], (
  fs, Path
) => {

  const Fs = fs.promises;

  const basePath = Path.normalize(Path.join(__dirname, ".."));

  function index(dir, filt, rip) {
    Fs.readdir(`${basePath}/${dir}`)
    .then(files => {
      let list = files.filter(filt);
      if (rip)
        list = list.map(f => f.replace(rip, ""));
      if (list.length === 0)
        throw Error(`Whoops ${dir}`);
      console.log(`Writing ${basePath}/${dir}/index.json`);
      Fs.writeFile(`${basePath}/${dir}/index.json`,
                   JSON.stringify(list));
    });
  }
  console.log("Building index.json files for directories");
  console.log("These files are used by the standalone version");
  index("css", f => /^[^.]+$/i.test(f));
  index("i18n", f => f !== "index.json"
        && f !== 'qqq.json'
        && /\.json$/.test(f),
       /\.json?$/);
  index("editions", f => /[A-Z].*\.js$/.test(f),
       /\.js$/);
  index("dictionaries", f => /\.dict$/.test(f),
       /\.dict$/);
});
