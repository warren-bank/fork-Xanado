/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

/**
 * Common utilities used on browser and server side
 * @return {string}
 */
define("common/Utils", [ "platform" ], Platform => {

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

			return Platform.i18n("$1 and $2",
							             list.slice(0, list.length - 1).join(", "),
							             list[list.length - 1]);
		}

    static stringify(value) {

      // Produce a string from holder[key]
      switch (typeof value) {
      case "undefined":
        return "undef";
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

      const partial = [];

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

      // Join all of the member texts together, separated with commas,
      // and wrap them in braces.
      return `{${partial.join(",")}}`;
    }
	}

	return Utils;
});
