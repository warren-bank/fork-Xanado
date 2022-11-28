/*@preserve Copyright (C) 2022 Crawford Currie http://c-dot.co.uk license MIT*/
/* eslint-env node */

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

/**
 * Analyse dependencies and generate packaed and compressed JS.
 */
class JSAnalyser {

  /**
   * Map of modules that have been studied so far.
   * @member {object.<string,boolean>}
   */
  studied = {};

  /**
   * Map from requirejs module name to a physical path.
   * @member {object.<string,string>}
   */
  modules = {};

  /**
   * Map from requirejs module name to a list of
   * requirejs module names that it depends on.
   * @member {object.<string,Array>}
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
    if (!this.depends_on[path])
      this.depends_on[path] = [];
    
    if (this.depends_on[path].indexOf(on) < 0) {
      this.depends_on[path].push(on);
      console.debug(path, "depends on", on);
    }
  }

  /**
   * Study the requirejs shim config for the module, adding dependencies
   *  so uncovered.
   * @param {string} path the module (requirejs path)
   * @return {Promise} promise that resolves to undefined when the
   * shim has been studied.
   */
  studyShim(path) {
    //console.debug("Study shim", path);
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
   * @param {string} js_path the module (physical file path)
   * @param {string} mod_id module identifier (unexpanded path)
   * @return {Promise} promise that resolves to undefined when the
   * JS has been studied.
   */
  studyJS(js_path, mod_id) {
    return this.config.readFile(this.config.resolvePath(js_path))
    .then(buffer => {
      const mod = {
        module: mod_id, path: js_path
      };
      this.modules[mod_id] = mod;

      const js = buffer.toString();
      const extras = [];

      // dialogs
      const dre = /\WDialog\s*\.\s*open\(\s*(["'])(.*?)\1/g;
      let m;
      while ((m = dre.exec(js)))
        this.addDependency(mod_id, m[2]);

      // requirejs calls
      const qre = /\Wrequirejs\s*\(\s*\[\s*(.*?)\]/g;
      while ((m = qre.exec(js))) {
        m[1].split(/\s*,\s*/)
        .map(mod => mod.replace(/^\s*["']/, "").replace(/["']\s*$/, ""))
        .forEach(mod => {
          // Add a dependency to the root to ensure the requirejs'ed
          // module gets loaded.
          this.addDependency("root", mod);
          extras.push(mod);
        });
      }

      const define = (deps, code) => {
        mod.hasDefine = true;
        if (Array.isArray(deps))
          deps.forEach(d => this.addDependency(mod_id, d));
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
        if (module.exports) {
          // commonJS module
          console.error("COMMONJS", mod_id);
        }
      } catch (e) {
        e.stack = e.stack.replace(/<anonymous>/g, js_path);
        console.error(e);
      }
      //console.debug(`Studied ${js_path} for ${module}`);
      if (!this.depends_on[mod_id])
        this.depends_on[mod_id] = [];

      return Promise.all(extras.map(d => this.studyModule(d)))
      .then(() => this.depends_on[mod_id]);
    })
    .then(deps => Promise.all(deps.map(d => this.studyModule(d))))
    .catch(e => {
      console.error("Unable to analyse", js_path, e.message);
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
   * Analyse the code and copy referenced modules
   * @param {string} infile root file to start analysis from. Path
   * relative to cfg.inBase.
   * @param {object} options control options
   * @param {boolean?} options.debug turn on debug
   * @param {boolean?} options.nopack disable packing
   * @param {boolean?} options.nocompress disable uglification
   * @param {string} options.config where to get requirejs.config from. Defaults
   * to reading it from the root.
   * @param {string?} options.base (directory) base of all URLs in the config
   * @return {string} the compressed code
   */
  copy(infile, options) {
    console.debug("Packing", infile);
    return this.analyse(infile)
    .then(mods => {
      console.debug("Analysis of",infile,"complete, copying");
      return Promise.all(
        mods.map(mod => {
          const path = this.config.resolvePath(mod.path);
          return this.config.copyFile(path);
        }));
    });
  }

  /**
   * Analyse the code and pack it into a single JS file.
   * @param {string} infile root file to start analysis from. Path
   * relative to cfg.inBase.
   * @param {object} options control options
   * @param {boolean?} options.debug turn on debug
   * @param {boolean?} options.nopack disable packing
   * @param {boolean?} options.nocompress disable uglification
   * @param {string} options.config where to get requirejs.config from. Defaults
   * to reading it from the root.
   * @param {string?} options.base (directory) base of all URLs in the config
   * @return {string} the compressed code
   */
  pack(infile, options) {
    console.debug("Compressing", infile);
    return this.analyse(infile)
    .then(mods => {
      console.debug("Analysis of",infile,"complete, combining");
      return Promise.all(
        mods.map(mod => this.config.readFile(this.config.resolvePath(mod.path))
                 .then(b => `_define_module("${mod.module}", () => {\n${b.toString()};\n});`)));
    })
    .then(js => js.join("\n\n"))
    .then(code => this.config.readFile("js/build/combined.js")
          .then(header => {
            console.debug("Combination of", infile, "built, uglifying");
            return `const _inBase = "${Path.normalize(this.config.inBase + "/..")}/";\n`
            + `const _outBase = "../";`
            + header + code;
          }))
    .then(code => {
      if (options.nocompress)
        return code;

      const res = uglify.minify(code, {
        compress: {},
        mangle: false,
        keep_fargs: true,
        keep_fnames: true,
        warnings: options.debug
      });
      if (res.warnings)
        console.warn(res.warnings);

      return res.code;
    });
  }
}
module.exports = JSAnalyser;
