/*@preserve Copyright (C) 2022 Crawford Currie http://c-dot.co.uk license MIT*/
/* eslint-env node */

const Fs = require("fs").promises;
const Path = require("path");
const assert = require("assert");
const uglify = require("uglify-js");

const { JSDOM } = require('jsdom');
const { window } = new JSDOM('<!doctype html><html><body></body></html>');
global.window = window;
global.document = window.document;
global.navigator = { userAgent: "node.js" };
const jQuery = require('jquery');
global.jQuery = jQuery;
global.$ = jQuery;

class Analyser {

  /**
   * Map of modules that have been studied so far.
   * @member {object<string,boolean>}
   */
  studied = {};

  /**
   * Map from requirejs module name to a physical path.
   * @member {object<string,string>}
   */
  modules = {};

  /**
   * Map from requirejs module name to a list of
   * requirejs module names that it depends on.
   * @member {object<string,[]>}
   */
  depends_on = {};

  constructor(config) {
    this.config = config;
  }

  /**
   * Add a dependency between two modules
   * @param {string} path the dependant (requirejs path)
   * @param {string} the dependee (requirejs path)
   */
  addDependency(path, on) {
    if (this.depends_on[path]) {
      if (this.depends_on[path].indexOf(on) < 0)
        this.depends_on[path].push(on);
    } else
      this.depends_on[path] = [ on ];
  }

  /**
   * Study the requirejs shim config for the module, adding dependencies
   *  so uncovered.
   * @param {string} path the module (requirejs path)
   * @return {Promise} promise that resolves to undefined when the
   * shim has been studied.
   */
  studyShim(path) {
    console.debug("Study shim", path);
    if (this.config.shim && this.config.shim[path]) {
      const shim = this.config.shim[path];
      if (Array.isArray(shim)) {
        return Promise.all(shim.map(m => {
          this.addDependency(path, m);
          return this.studyModule(m);
        }));
      }
      else if (typeof shim === "object") {
        if (shim.deps && Array.isArray(shim.deps)) {
          return Promise.all(shim.deps.map(m => {
            this.addDependency(path, m);
            return this.studyModule(m);
          }));
        }
      }
    }
    return Promise.resolve();
  }

  /**
   * Study a file of JS code, adding dependencies
   * so uncovered.
   * @param {string} path the module (physical file path)
   * @return {Promise} promise that resolves to undefined when the
   * JS has been studied.
   */
  studyJS(js_path, module) {
    console.debug(`Studying ${js_path} for ${module}`);
    return Fs.readFile(js_path)
    .then(buffer => {
      this.modules[module] = js_path;
      const js = buffer.toString();
      let hasDefine = false;
      return new Promise(resolve => {
        const define = (deps, code) => {
          hasDefine = true;
          if (Array.isArray(deps)) {
            console.debug(module, "depends on", deps);
            this.depends_on[module] = deps;
            Promise.all(deps.map(d => this.studyModule(d)))
            .then(() => resolve());
          }
          else
            resolve();
        };
        define.amd = true;
        const requirejs = define;
        requirejs.config = () => {};
        const require = m => {
          console.error(`Unexpected require("${m}") in ${js_path} cannot be resolved`);
        };
        try {
          const module = {};
          eval(js);
        } catch (e) {
          e.stack = e.stack.replace(/<anonymous>/g, js_path);
          console.error(e);
        }
        if (!hasDefine)
          resolve();
      });
    })
    .catch(e => {
      console.error(js_path, "read failed", e);
    });
  }

  /**
   * Study a module, adding dependencies
   * so uncovered.
   * @param {string} path the module (requirejs path)
   * @return {Promise} promise that resolves to undefined when the
   * JS has been studied.
   */
  studyModule(path) {
    if (this.studied[path])
      return Promise.resolve();
    this.studied[path] = true;
    const shim = this.studyShim(path);
    const js_path = this.config.resolveJSPath(path);
    if (!js_path) {
      console.error(`No JS path for ${path}`);
      return Promise.resolve();
    }
    console.debug(`Studying ${js_path}`);
    return this.studyJS(js_path, path);
  }

	/**
   * Compute a partial ordering of modules for loading. Only pass
   * the root key, other params are internal.
   * @param {string} key module name to explore
   * @param {string[]?} array containing the computed ordering
   * @param {object<string,boolean>} visited record of modules visited
   */
	partialOrder(key, stack, visited) {
		if (!stack) stack = [];
		if (!visited) visited = {};
		visited[key] = true;
    if (this.depends_on[key])
		  for (const mod of this.depends_on[key]) {
			  if (!visited[mod])
				  this.partialOrder(mod, stack, visited);
		  }
		stack.push(key);
		return stack;
	}

  /**
   * Compute dependencies and report a module loading order.
   * @param {string} requirejs path to the root module (main program)
   * @return {Promise} promise resolving to an ordered list of paths
   * of contributing JS files
   */
  analyse(root) {
    return this.studyJS(root, "root")
    .then(() => this.partialOrder("root")
          .map(k => this.modules[k])
          .filter(m => m));
  }

  /**
   * Analyse the code and generate an uglified version.
   * @param {string} root root file to start analysis from
   * @param {string?} outfile fiole to write (default is to write to stdout)
   * @param {object} options control options
   * @param {boolean?} options.debug turn on debug
   * @param {string} options.config where to get requirejs.config from. Defaults
   * to reading it from the root.
   * @param {string?} options.base (directory) base of all URLs in the config
   */
  distribute(root, outfile, options) {
    console.debug("distribute", root, outfile);
    return this.analyse(root)
    .then(jses => Promise.all(
      jses.map(js => Fs.readFile(js).then(b => b.toString()))))
    .then(js => js.join("\n\n"))
    .then(code => {
      const res = uglify.minify(code, {
        compress: options.debug ? false : {},
        keep_fargs: options.debug,
        keep_fnames: options.debug,
        mangle: !options.debug,
        warnings: options.debug
      });
      if (res.warnings)
        console.warn(res.warnings);

      if (outfile)
        return this.config.writeFile(outfile, res.code);
      else
        return Promise.resolve(console.log(res.code));
    });
  }
}

module.exports = Analyser;
