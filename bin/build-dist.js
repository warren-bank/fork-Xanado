/**
 * Xanado build script. Creates a "dist" directory at the root of the
 * development tree that contains packed and compressed versions of the
 * Xanado browser scripts.
 */
const getopt = require("posix-getopt");
const Path = require("path");
const assert = require("assert");
const { JSDOM } = require('jsdom');

const Configurator = require("../js/build/Configurator.js");
const JSAnalyser = require("../js/build/JSAnalyser.js");
const analyseCSS = require("../js/build/analyseCSS.js");
const updateIndexes = require("../js/build/updateIndexes.js");

const inBase = Path.relative(".", `${__dirname}/..`);

/**
 * Process an HTML that has rjs_main and a requirejs include.
 * Analyse the JS linked to generate a flat version of it. Edits
 * the HTML to point to the new flat code before writing it to "dist".
 * @param {Element} rjs_main_el `#rjs_main` script element
 * This is a requirejs path.
 * @param {Element} data_main requirejs script element
 * @param {Document} DOM document
 */
function processHTML(rjs_main_el, data_main_el, document) {
  const m = /.*\s(?:const|let|var)\s+rjs_main\s*=\s*(["'])(.*?)\1/.exec(rjs_main_el.textContent);
  assert(m);
  // Rewrite rjs_main to a full js path
  const parts = Path.parse(m[2]);
  delete parts.base;
  parts.ext = ".js";
  const rjs_main = Path.format(parts);

  const data_main = data_main_el.getAttribute("data-main");

  const config = new Configurator(inBase, options);
  return config.load(Path.join("html", data_main))
  .then(() => {
    let promise;

    if (options.nopack) {
      // COPY
      promise = Promise.all([
        // require.js
        config.copyFile(data_main_el.getAttribute("src").replace(/^\.\.\//, "")),
        config.copyFile(data_main.replace(/^\.\.\//, "")),
        config.copyFile(config.resolvePath(rjs_main)),
        new JSAnalyser(config).copy(rjs_main, options)
      ]);
    } else {
      // PACK
      rjs_main_el.remove();
      data_main_el.removeAttribute("data-main");
      data_main_el.src = Path.join("..", config.resolvePath(rjs_main));
      promise = new JSAnalyser(config).pack(rjs_main, options)
      .then(code => config.writeFile(config.resolvePath(rjs_main), code));
    }

    return promise.then(() => {
      console.debug(rjs_main, "written, analysing CSS hrefs");
      const links = document.querySelectorAll("link[href]");
      const p = [];
      links.forEach(l => { // NodeList, can't use .map(
        if (l.rel === "stylesheet") {
          const path = Path.join("html", l.href);
          // copy url() refs in the CSS
          p.push(analyseCSS(path, config));
        }
      });
      return Promise.all(p);
    });
  });
}

/**
 * Study an HTML file read from the html directory to idnetify if
 * it meets the criteria for a compressible module.
 * @param {string} f file name, relative to HTML directory
 */
function analyseHTML(f, config) {
  return config.readFile(Path.join("html", f))
  .then(b => b.toString())
  .then(html => {
    const jsdom = new JSDOM(html);
    const document = jsdom.window.document;
    const rjs_main = document.querySelector("#rjs_main");
    const data_main = document.querySelector("script[data-main]");
    if (rjs_main && data_main) {
      return processHTML(rjs_main, data_main, document)
      .then(() => jsdom.serialize());
    }
    return Promise.resolve(html);
  })
  .then(html => config.writeFile(Path.join("html", f), html));
}

/**
 * Scan the html directory under the base and analyse each HTML
 * found there.
 */
function analyseHTMLs(config) {
  return config.readdir("html")
  .then(files => files.filter(f => /\.html?$/.test(f)).map(
    f => analyseHTML(f, config)));
}

const DESCRIPTION = [
  "USAGE",
  `\tnode ${Path.relative(".", process.argv[1])} [options]`,
  "\nDESCRIPTION",
  "\tBuild compressed files for fast loading into browsers, in",
  "\ta 'dist' directory under the repository root.",
  "\nOPTIONS",
  "\t-d, --debug - Enable debug trace",
  "\t-h, --help - Help info",
  "\t-P, --nopack - Disable packing JS into a single file for each HTML",
  "\t-C, --nocompress - Disable compressing JS" ].join("\n");

const go_parser = new getopt.BasicParser(
  'd(debug)P(nopack)C(nocompress)', process.argv);
const options = {};
let option;
while ((option = go_parser.getopt())) {
  switch (option.option) {
  default: console.error(DESCRIPTION); process.exit();
  case 'd': options.debug = true; break;
  case 'P': options.nopack = true; break;
  case 'C': options.nocompress = true; break;
  }
}

if (!options.debug) {
  console.debug = () => {};
}

const cfg = new Configurator(inBase, options);

Promise.all([
  cfg.copyDir("audio", f => /\.mp3$/.test(f)),
  cfg.copyDir("images", f => /\.(jpg|svg|gif|png|ico)$/.test(f)),
  cfg.mkPathTo(Path.join("games", "README")),
  cfg.mkPathTo(Path.join("sessions", "README")),
  updateIndexes(inBase)
  .then(() => Promise.all([
    cfg.copyDir("css", f => f === "index.json" || /\.css$/.test(f), true),
    cfg.copyDir("dictionaries", f => f === "index.json" || /\.dict$/.test(f)),
    cfg.copyDir("editions", f => f === "index.json" || /\.js$/.test(f)),
    cfg.copyDir("i18n", f => f === "index.json" || /\.json$/.test(f))
  ])),
  analyseHTMLs(cfg)
])
.then(() => {
  const exec = require("child_process").exec;
  const script = exec("npm run docker");
  script.stdout.on('data', data => {
    console.log(data.toString());
  });
  script.stderr.on('data', data => {
    console.error(data.toString());
  });
  script.on('exit', code => {
    console.log('Build finished ' + code);
  });
});


