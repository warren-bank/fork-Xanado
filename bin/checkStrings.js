/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

/**
 * Check that strings occur in code and translations files
 */
const requirejs = require("requirejs");

requirejs.config({
  baseUrl: `${__dirname}/..`,
  nodeRequire: require
});

const readline = require('readline');

requirejs([
  "fs", "path"
], (
  fs, Path
) => {

  const Fs = fs.promises;

  const basePath = Path.normalize(Path.join(__dirname, ".."));

  const found = {};

  const fileContents = {};

  function addString(string, file) {
    if (!found[string])
      found[string] = {};
    found[string][file] = true;
  }

  function scan(file, ext, re) {
    if (ext.test(file)) {
      return Fs.readFile(file)
      .then(html => {
        fileContents[file] = html;
        let m;
        while ((m = re.exec(html)))
          addString(m[2], file);
      });
    }           
    return Fs.readdir(file)
    .then(files => Promise.all(files.map(f => scan(Path.join(file, f), ext, re))))
    .catch(e => undefined);
  }

  function checkParameters(id, qqqString, langString, mess) {
    if (/^_.*_$/.test(qqqString))
        return;
    let m, rea = /(\$\d+)/g;
    while ((m = rea.exec(qqqString))) {
      let p = m[1];
      const reb = new RegExp(`\\${p}([^\\d]|\$)`);
      if (!reb.test(langString))
        mess.push(`\t"${id}": ${p} not found in "${langString}"`);
    }
    while ((m = rea.exec(langString))) {
      let p = m[1];
      const reb = new RegExp(`\\${p}([^\\d]|\$)`);
      if (!reb.test(qqqString))
        mess.push(`\t"${id}": ${p} unexpected in "${langString}"`);
    }
  }

  function changeString(string) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return new Promise(resolve => {
      rl.question(
        `Change ID "${string}"? `,
        answer => {
          rl.close();
          if (answer && answer !== "n" && answer !== "N") {
            console.log(`\tChanging "${string}" to "${answer}"`);
            for (const lang in strings) {
              if (lang[answer])
                throw Error(`Conflict ${answer}`);
              lang[answer] = lang[string];
              delete lang[string];
            }
            const re = new RegExp(`"${string}"`, "g");
            for (const file in fileContents) {
              fileContents[file] =
              fileContents[file].replace(re, `"${answer}"`);
            }
            console.log(`\tChanged "${string}" to "${answer}"`);
          }
          resolve();
        });
    });
  }

  async function changeStrings() {
    for (const string in strings.qqq) {
      if (/\$/.test(string))
        await changeString(string);
    }
  }

  const strings = {};

  Promise.all([
    scan("html", /\.html$/,
         /data-i18n(?:|-placeholder|-tooltip)=(["'])(.*?)\1/g),
    scan("js", /\.js$/,
         /\.i18n\s*\(\s*(["'])(.*?)\1/g),
    scan("js", /\.js$/,
         /\/\*i18n\*\/\s*(["'])(.*?)\1/g),
    Fs.readdir(Path.join(basePath, "i18n"))
    .then(lingos => Promise.all(
      lingos.filter(f => /\.json$/.test(f))
      .map(lingo => Fs.readFile(Path.join(basePath, "i18n", lingo))
           .then(json => {
             const lang = lingo.replace(/\.json$/, "");
             strings[lang] = JSON.parse(json);
             delete strings[lang]["@metadata"];
           })
           .catch(e => {
             console.error(`Parse error reading ${lingo}`);
             throw e;
           }))))
  ])
  .then(() => {   
    let qqqError = false;

    // Check strings are in qqq and add to en if necessary
    for (const string of Object.keys(found).sort()) {
      if (!strings.qqq[string]) {
        console.error(`"${string}" not found in qqq`);
        strings.qqq[string] = string;
        qqqError = true;
      }
    }

    // Check strings in qqq.json occur at least once in html/js
    for (const string of Object.keys(strings.qqq)
               .filter(s => !found[s])) {
      console.error(
        `"${string}" was found in qqq, but is not used in code`);
      delete strings.qqq[string];
      qqqError = true;
    }

    if (qqqError)
      throw Error("qqq.json must be correct");

    for (const lang of Object.keys(strings).filter(l => l !== "qqq")) {
      let mess = [];
      // Check that all keys in qqq are also in other language and
      // that the same parameters are present
      for (const string of Object.keys(strings.qqq)) {
        if (!strings[lang][string])
          mess.push(`\t${string}`);
      }
      if (mess.length > 0)
        console.error("----", lang, "is missing translations for:\n",
                      mess.join("\n"));

      mess = [];
      for (const string of Object.keys(strings[lang])) {
        if (strings[lang][string])
          checkParameters(string, strings.qqq[string], strings[lang][string], mess);
      }
      if (mess.length > 0)
        console.error("----", lang, "has parameter inconsistencies:\n",
                      mess.join("\n"));

      mess = [];
      for (const string of Object.keys(strings[lang])) {
        if (!strings.qqq[string])
          mess.push(`\t${string}`);
      }
      if (mess.length > 0)
        console.error("----", lang, "has strings that are not in qqq\n",
                      mess.join("\n"));
      if (lang !== "en") {
        mess = [];
        for (const string of Object.keys(strings[lang])) {
          if (lang !== "en" && string == strings[lang][string])
            mess.push(`\t${string}`);
        }
        if (mess.length > 0)
          console.error(
            "----",
            lang,
            "has strings that may not have been translated\n",
            mess.join("\n"));
      }
    }

    // strings[lang] contains the JSON for than language

    changeStrings();
  });
});
