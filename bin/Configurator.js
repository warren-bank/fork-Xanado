const Fs = require("fs").promises;
const Path = require("path");
const assert = require("assert");

/**
 * Load the requirejs.config from the given file.
 * @param {string} rjs_config path to config file
 * @return {Promise} promise that resolves to this
 */
class Configurator {

  adapt(rjs_config, base) {
    return Fs.readFile(rjs_config)
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
      if (base)
        config.baseUrl = Path.join(base, config.baseUrl);
      console.debug("Config from", rjs_config);
      console.debug("Base url", config.baseUrl);
      return this;
    });
  }

  /**
   * Resolve the given requirejs path expression by expanding
   * paths defined in the config.
   * @param {string} path to resolve
   * @return {string?} resolved (relative) path
   */
  resolvePath(path) {
    //console.debug(`Resolve "${path}"`);
    if (this.paths[path])
      return Path.join(this.paths[path]);
    const m = /^(.*)\/([^/]+)$/.exec(path);
    if (m) {
      const p = this.resolvePath(m[1]);
      if (p)
        return Path.join(p, m[2]);
    }
    return path;
  }

  /**
   * Resolve a requirejs module path to a physical on-disc
   * path name.
   * @param {string} mod module name (as used in define())
   * @return {string?} (relative) path to the .js file for the module
   */
  resolveJSPath(mod) {
    const p = this.resolvePath(mod);
    if (!p) return undefined;
    const pat = Path.parse(Path.join(this.baseUrl, p));
    delete pat.base;
    pat.ext = ".js";
    return Path.format(pat);
  }

  /**
   * Make the path to a directory
   * @param {string} dir the path
   * @return {Promise} a promise to make the path
   */
  mkpath(path) {
    const m = /^(.+)\/(.*?)$/.exec(path);
    const p = (m) ? this.mkpath(m[1]) : Promise.resolve();
    path = Path.join(this.outBase, path);
    return p.then(() => Fs.stat(path))
    .then(stat => {
      assert(stat.isDirectory(), `Directory/plain file conflict at ${path}`);
      return Promise.resolve();
    })
    .catch(e => {
      //console.error(e);
      console.debug("mkdir", path);
      return Fs.mkdir(path)
      .catch(e => {});
    });
  }

  writeFile(f, data) {
    const m = /^(.+)\/(.*?)$/.exec(f);
    const p = (m) ? this.mkpath(m[1]) : Promise.resolve();
    return p
    .then(() => Fs.writeFile(Path.join(this.outBase, f), data));
  }

  copyFile(inf, outf) {
    const m = /^(.+)\/(.*?)$/.exec(outf);
    console.debug(inf, "->", outf);
    const p = (m) ? this.mkpath(m[1]) : Promise.resolve();
    return p
    .then(() => Fs.readFile(Path.join(this.inBase, inf)))
    .then(data => this.writeFile(outf, data));
  }

  copyDir(dirName, check, recurse) {
    const outDir = Path.join(this.outBase, dirName);
    return this.mkpath(dirName)
    .then(() => Fs.readdir(Path.join(this.inBase, dirName)))
    .then(files => {
      let promises =
          files.filter(f => !check || check(f))
          .map(f => this.copyFile(Path.join(dirName, f),
                             Path.join(dirName, f)));
      if (recurse) {
        files.map(
          f => Fs.stat(Path.join(this.inBase, dirName, f))
          .then(stat => {
            if (stat.isDirectory())
              promises.push(this.copyDir(Path.join(dirName, f), check, recurse));
          }));
      }
      return Promise.all(promises);
    });
  }
}

module.exports = Configurator;
