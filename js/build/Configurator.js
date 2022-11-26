const Fs = require("fs").promises;
const Path = require("path");
const assert = require("assert");
const uglify = require("uglify-js");
const CSS = require("css");

/**
 * Load the requirejs.config from the given file.
 * @param {string} rjs_config path to config file
 * @return {Promise} promise that resolves to this
 */
class Configurator {

  /**
   * Base path for files being read. This will point to the root of
   * the development directory.
   * @member {string}
   */
  inBase = "";

  /**
   * Base path for files being written. This will point to the "dist"
   * dir under the root of the development directory.
   * @member {string}
   */
  outBase = "";

  /**
   * @param {string} inBase path of root directory
   * @param {object} options processing options
   * @param {boolean} options.debug true to enable debug messages
   */
  constructor(inBase, options) {
    this.inBase = Path.format({ dir: inBase, name: "." });
    this.outBase = Path.format({ dir: inBase, name: "dist" });
    this.options = options;
  }

  /**
   * Load the config specified by requirejs.config in the given
   * js file.
   * @param {string} rjs_config relative path to rjs_config to read
   */
  load(rjs_config) {
    return this.readFile(rjs_config)
    .catch(e => {
      console.error("Failed to read", rjs_config, e);
      throw e;
    })
    .then(buffer => {
      let config;
      const __dirname = ".";
      const requirejs = () => {};
      requirejs.config = cfg => {
        //console.debug(cfg);
        config = cfg;
      };
      const define = () => {};
      eval(buffer.toString());
      for (const f of Object.keys(config))
        this[f] = config[f];
      return this;
    });
  }

  /**
   * Resolve the given requirejs path expression by expanding
   * paths defined in the current requirejs.config.
   * @param {string} path to resolve
   * @return {string?} resolved path.
   */
  resolvePath(path) {
    const parts = Path.normalize(path).split(Path.sep);
    if (this.paths[parts[0]]) {
      parts[0] = this.paths[parts[0]];
      path = parts.join(Path.sep);
    }
    if (this.baseUrl)
      return Path.join("html", this.baseUrl, path);
    return Path.join("html", path);
  }

  /**
   * Resolve a requirejs module path to a physical on-disc
   * file name.
   * @param {string} mod module name (as used in define())
   * @return {string?} path to the .js file for the module
   */
  resolveJSPath(mod) {
    const p = this.resolvePath(mod);
    if (!p) return undefined;
    const pat = Path.parse(p);
    delete pat.base; // force it to use dir/name.ext
    pat.ext += ".js";
    return Path.format(pat);
  }

  /**
   * Make the directory path above the given file.
   * @param {string} file file path
   * @return {Promise} a promise that resolves to undefined
   */
  mkPathTo(file) {
    const parts = Path.parse(Path.resolve(this.outBase, file));
    if (parts.dir)
      return Fs.mkdir(parts.dir, { recursive: true });
    return Promise.resolve();
  }

  /**
   * Read list of directory contents.
   * @param {string} dir dir to read
   * @return {string[]} list of file names
   */
  readdir(d) {
    return Fs.readdir(Path.resolve(this.inBase, d));
  }

  /**
   * Read data from the given file.
   * @param {string} f the file path
   * @return {buffer} the data
   */
  readFile(f) {
    return Fs.readFile(Path.resolve(this.inBase, f));
  }

  /**
   * Write data to the given file, creating the path is needed.
   * @param {string} f the file path
   * @param data {string|buffer} the data to write
   */
  writeFile(f, data) {
    if (this.options.compress) {
      if (/\.js$/.test(f)) {
        const res = uglify.minify(data.toString(), {
          compress: {},
          mangle: false,
          keep_fargs: true,
          keep_fnames: true,
          warnings: true
        });
        data = res.code;
      } else if (/\.css$/.test(f)) {
        data = CSS.stringify(CSS.parse(data.toString()), {
          compress: true
        });
      } else if (/\.html$/.test(f)) {
        // Not worth the effort
      }
    }
    const fout = Path.resolve(this.outBase, f);
    return this.mkPathTo(f)
    .then(() => Fs.writeFile(fout, data))
    .then(() => console.debug("...wrote", fout, this.options.debug ? "" : "compressed"));
  }

  /**
   * Copy a file from a source to a dest
   * @param {string} inf the input file path
   * @param {string?} outf the output file path, optional. If undefined, assumed
   * to be the same as `inf`.
   */
  copyFile(inf, outf) {
    if (typeof outf !== "string")
      outf = inf;
    return this.readFile(inf)
    .then(data => this.writeFile(outf, data))
    .then(() => {
      console.debug("Copied", inf, outf !== inf ? `to ${outf}` : "");
    })
    .catch(e => {
      console.error("**** Copy", inf, outf !== inf ? `to ${outf}` : "", "failed\n", e);
    });
  }

  /**
   * Copy a directory.
   * @param {string} dirName path to directory to copy.
   * @param {function} check optional function used to filter file names
   * @param {boolean} recurse true to copy recursively, default is a
   * single level.
   */
  copyDir(dirName, check, recurse) {
    return Fs.readdir(Path.join(this.inBase, dirName))
    .then(files => {
      let promises =
          files.filter(f => !check || check(f))
          .map(f => this.copyFile(Path.join(dirName, f)));
      if (recurse) {
        files.map(
          f => Fs.stat(Path.join(this.inBase, dirName, f))
          .then(stat => {
            if (stat.isDirectory())
              promises.push(this.copyDir(
                Path.join(dirName, f), check, recurse));
          }));
      }
      return Promise.all(promises);
    });
  }
}

module.exports = Configurator;
