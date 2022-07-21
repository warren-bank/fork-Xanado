/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/
define(["fs", "path"], (fs, Path) => {
  const Fs = fs.promises;
  let TX = {};

  /**
   * Partial implementation of jquery i18n to support server-side
   * string translations using the same data files as browser-side.
   */
  function I18N(s) {
    if (typeof s === "string") {
      if (typeof TX[s] !== "undefined")
        s = TX[s];
      // TODO: support PLURAL
      return s.replace(
        /\$(\d+)/g,
        (m, index) => arguments[index]);
    }
    return {
      load(locale) {
        let langdir = Path.normalize(requirejs.toUrl("i18n"));
        let langfile = Path.join(langdir, `${locale}.json`);
        // Try the full locale e.g. "en-US"
        return Fs.readFile(langfile)
        .catch(e => {
          // Try the first part of the locale i.e. "en"
          // from "en-US"
          langfile = Path.join(langdir,
                               `${locale.split("-")[0]}.json`);
          return Fs.readFile(langfile);
        })
        .catch(
          /* istanbul ignore next */
          e => {
            // Fall back to "en"
            langfile = Path.join(langdir, "en.json");
            return Fs.readFile(langfile);
          })
        .then(buffer => {
          TX = JSON.parse(buffer.toString());
        });
      }
    };
  }

  return I18N;
});
