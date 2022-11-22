const Configurator = require(`${__dirname}/Configurator.js`);
const Analyser = require(`${__dirname}/Analyser.js`);
const getopt = require("node-getopt");
const Fs = require("fs").promises;
const Path = require("path");
const assert = require("assert");

const cfg = new Configurator();

function processHTML() {
  return cfg.mkpath("html")
  .then(() => Fs.readdir(Path.join(cfg.inBase, "html")))
  .then(files => files.filter(f => /\.html?$/.test(f)).map(
    f => Fs.readFile(Path.join(cfg.inBase, "html", f))
    .then(b => b.toString())
    .then(html => {
      let m = /.*\srjs_main\s*=\s*(["'])(.*?)\1/.exec(html);
      if (m) {
        const rjs_main = m[2];
        m = /<script data-main=(["'])(.*?)\1/.exec(html);
        if (m) {
          const data_main = m[2];
          return cfg.adapt(data_main, cfg.inBase)
          .then(() => {
            const js_main = cfg.resolvePath(rjs_main);
            const root = Path.join(cfg.inBase, js_main) + ".js";
            const outfile = js_main + ".js";
            return new Analyser(cfg).distribute(root, outfile, options)
            .then(() => {
              return html
              .replace(/<script data-main=(["'])(.*?)\1.*?<\/script>/,
                       `<script src="../${js_main}"></script>`)
              .replace(/(<link href=")(.*?)"/g,
                       (m, p1, p2) => {
                         const pat = Path.parse(p2);
                         pat.dir = "css";
                         pat.dir = Path.join("..", "css");
                         cfg.mkpath("css")
                         .then(() => cfg.copyFile(
                           Path.join("html", p2), Path.format(pat)));
                         return p1 + Path.format(pat) + '"';
                       });
            });
          });
        } else
          throw Error(`rjs_man with no data-main in ${f}`);
      } else
        return html;
    })
    .then(html => cfg.writeFile(Path.join("html", f), html))));
}
const DESCRIPTION =
      `USAGE\n node ${process.argv[1]} [options] <root JS file> <out file>`;
 
const OPTIONS = [
  [ "c", "config=ARG", "JS file to read to get requirejs.config (default is to read it from the root .js)" ],
  [ "d", "debug", "Enable detailed debug trace" ],
  [ "b", "base=ARG", "Execution base; relative paths will be resolved relative to this" ]
];

const go = getopt.create(OPTIONS)
      .bindHelp()
      .setHelp(`${DESCRIPTION}\nOPTIONS\n[[OPTIONS]]`)
      .parseSystem();

const options = go.options;

if (!options.debug) {
  console.debug = () => {};
}

cfg.inBase = `${__dirname}/..`;
cfg.outBase = `${__dirname}/../dist`;

cfg.copyDir("audio", f => /\.mp3$/.test(f))
.then(() => cfg.copyDir("css", f => f === "index.json" || /\.css$/.test(f), true))
.then(() => cfg.copyDir("dictionaries", f => f === "index.json" || /\.dict$/.test(f)))
.then(() => cfg.copyDir("editions", f => f === "index.json" || /\.js$/.test(f)))
.then(() => cfg.copyDir("games", f => f === "README"))
.then(() => cfg.copyDir("i18n", f => f === "index.json" || /\.json$/.test(f)))
.then(() => cfg.copyDir("images", f => /\.(jpg|svg|gif|png|ico)$/.test(f)))
.then(() => cfg.mkpath("sessions"))
.then(() => processHTML());


