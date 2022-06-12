/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env amd */

define("common/Debuggable", () => {

    /**
     * Abstract base class for things that might be fed to _debug functions.
     * This normalises the bahaviour of valueOf and toString so they
     * both return the same thing - a string representation of a complex
     * object.
     */
	class Debuggable {

		/**
		 * Return a simple string representation for use in debug
         * @return {string}
		 */
        toString() {
            throw new Error("Pure virtual");
        }

		/**
		 * Return a simple string representation for use in debug
         * @return {string}
		 */
        valueOf() {
            return this.toString();
        }
    }

    return Debuggable;
});
