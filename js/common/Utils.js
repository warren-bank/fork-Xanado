/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

/**
 * Common utilities used on browser and server side
 * @return {string}
 */
define([ "platform" ], Platform => {

  class Utils {

    /**
     * Generate a unique 16-character key using a-z0-9
     * @param {string[]?} miss optional array of pregenerated keys to miss
     * @return {string} a key not already in miss
     */
    static genKey(miss) {
      const chs = "0123456789abcdef".split("");
      if (miss) {
        let key;
        do {
          key = Utils.genKey();
        } while (key in miss);
        return key;
      }
      const s = [];
      for (let i = 0; i < 16; i++)
        s.push(chs[Math.floor(Math.random() * 16)]);
      return s.join("");
    }

    /**
     * Parse the URL to extract parameters. Arguments are returned
     * as keys in a map. Argument names are not decoded, but values
     * are. The portion of the URL before `?` is returned in the
     * argument map using the key `_URL`. Arguments in the URL that
     * have no value are set to boolean `true`. Repeated arguments are
     * not supported (the last value will be the one taken).
     * @return {Object<string,string>} key-value map
     */
    static parseURLArguments(url) {
      const bits = url.split("?");
      const urlArgs = { _URL: bits.shift() };
      const sargs = bits.join("?").split(/[;&]/);
      for (const sarg of sargs) {
        const kv = sarg.split("=");
        const key = kv.shift();
        urlArgs[decodeURIComponent(key)] =
        (kv.length === 0) ? true : decodeURIComponent(kv.join("="));
      }
      return urlArgs;
    }

    /**
     * Reassemble a URL that has been parsed into parts by parseURLArguments.
     * Argument are output sorted alphabetically.
     * @param {object} args broken down URL in the form created by
     * parseURLArguments
     * @return {string} a URL string
     */
    static makeURL(parts) {
      const args = Object.keys(parts)
            .filter(f => !/^_/.test(f)).sort()
            .map(k => parts[k] && typeof parts[k] === "boolean" ?
                 k : `${k}=${encodeURIComponent(parts[k])}`);
      return `${parts._URL}?${args.join(";")}`;
    }

    /**
     * Format a time interval in seconds for display in a string e.g
     * `formatTimeInterval(601)` -> `"10:01"`
     * Maximum ordinal is days.
     * @param {number} t time period in seconds
     */
    static formatTimeInterval(t) {
      const neg = (t < 0) ? "-" : "";
      t = Math.abs(t);
      const s = `0${t % 60}`.slice(-2);
      t = Math.floor(t / 60);
      const m = `0${t % 60}`.slice(-2);
      t = Math.floor(t / 60);
      if (t === 0) return `${neg}${m}:${s}`;
      const h = `0${t % 24}`.slice(-2);
      t = Math.floor(t / 24);
      if (t === 0) return `${neg}${h}:${m}:${s}`;
      return `${neg}${t}:${h}:${m}:${s}`;
    }

    /**
     * Construct a test string giving a friendly description of a list
     * of "things" e.g. `andList(["A","B","C"])` will return `A, B and C`
     */
    static andList(list) {
      if (list.length == 0)
        return "";
      if (list.length == 1)
        return list[0];

      return Platform.i18n("players-tail",
                           list.slice(0, list.length - 1).join(", "),
                           list[list.length - 1]);
    }

    /**
     * Generate readable (though not parseable) representation of object,
     * for use in debugging. Easier to read than JSON.stringify. Used instead
     * of toString() and valueOf() which are inconsistent between platforms.
     */
    static stringify(value) {
      // Based on Crockford's polyfill for JSON.stringify.

      switch (typeof value) {
      case "undefined":
        return "?";
      case "string":
        return `"${value}"`;
      case "number":
      case "boolean":
      case "null":
        return String(value);
      }

      // Due to a specification blunder in ECMAScript,
      // typeof null is "object"
      if (!value)
        return "null";

      // Use the stringify function, if the object has one.
      if (typeof value === "object"
          && typeof value.stringify === "function")
        return value.stringify();

      const partial = [];

      // Built-in types
      if (value instanceof Date)
        return value.toISOString();

      // Is the value an array?
      if (Object.prototype.toString.apply(value) === "[object Array]") {
        for (const v of value)
          partial.push(Utils.stringify(v));

        return `[${partial.join(",")}]`;
      }

      // Otherwise this is an object
      for (const k in value) {
        if (Object.prototype.hasOwnProperty.call(value, k)) {
          const v = Utils.stringify(value[k]);
          if (v)
            partial.push(`${k}:${v}`);
        }
      }
      return `{${partial.join(",")}}`;
    }
  }

  return Utils;
});
