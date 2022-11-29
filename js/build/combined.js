// Header code that goes at the top of a combined code block.  Most of
// our modules are anonymous AMD modules, so the file name is the
// module name for the purposes of dependencies. We have to be able to
// resolve a string module name to a block of code included in the
// combined code block.
//
// JSAnalyser wraps each block of module code in a _define_module
// call, which is passed the name of the module (file) and the code of
// the module wrapped in an anonymous function. _define_module saves
// the function in _module_defs.  When the module is required by
// another module, _get_module is called, which runs the code from
// _module_defs and caches the result of any embedded define() call in
// the module. This is then cached in `_modules` to optimise future
// calls to _get_module.
//
// const _outBase; is defined by JSAnalyser.
const _modules = {};
const _module_defs = {};
let _definition;

/**
 * Wrapper around code read from a .js file. If the name of the module
 * is `root`, the definition function is run immediately. Otherwise it
 * is cached in _module_defs for when it is needed.
 * @param {string} name module name
 * @param {function} definition anonymous function that runs the code
 * for the module
 * @private
 */
function _define_module(name, definition) {
  if (name === "root")
    definition();
  else
    _module_defs[name] = definition;
}

/**
 * Get the result of the define() call in the named module.
 * @param {string} name module name
 * @private
 */
function _get_module(name) {
  if (!_modules[name]) {
    if (_module_defs[name]) {
      _definition = null;
      _module_defs[name]();
      if (!_definition)
        console.warn(`Included non-AMD module ${name}`);
      _modules[name] = _definition;
    }
  }
  return _modules[name];
}

/**
 * Implementation of requirejs `define`. Loads dependencies and calls
 * the provided anonymous function (callback).
 * See the requirejs documentation for parameter information.
 * @private
 */
function define(name, deps, callback) {
  if (typeof name !== 'string') {
    callback = deps;
    deps = name;
    name = null;
  }

  if (!Array.isArray(deps)) {
    callback = deps;
    deps = [];
  }

  const params = deps.map(m => _get_module(m));
  _definition = callback.apply(null, params);
}
define.amd = true;

/**
 * If the named module isn't in the cached, load it using `$.get()`
 * @param {string} name module name
 * @private
 */
function _require_js(name) {
  // Check AMD modules first
  const m = _get_module(name);
  if (m)
    return Promise.resolve(m);
  // const _inBase; is defined by JSAnalyser, and gives the path to
  // js modules.
  return $.get(`${_inBase}${name}.js`)
  .then(js => (_modules[name] = eval(js)));
}

/**
 * `requirejs` is used to "demand-load" a module, the name of which may
 * not be known at build time.
 * See the requirejs documentation for parameter information.
 * @private
 */
function requirejs(deps, fun) {
  if (typeof deps === "function") {
    fun = deps;
    deps = [];
  }
  return Promise.all(deps.map(d => _require_js(d)))
  .then(args => fun.apply(null, args));
}

/**
 * Map paths that are expressed relative to the baseUrl in requirejs.config
 * to a URL relative to the HTML in the output.
 * @param {string} p the path to map
 */
// const _outBase; is defined by JSAnalyser.
requirejs.toUrl = p => `${_outBase}${p}`;
