/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env amd */

/**
 * Simple function to generate a 8-byte random hex key
 * @return {string}
 */
define("common/Utils", () => {

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
	}

	return Utils;
});
