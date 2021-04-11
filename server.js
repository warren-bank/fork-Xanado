/* eslint-env node */

// This is the requirejs configuration and top level invocation for the server
// only. The actual code is in js/server/Server.js. Note that paths are relative
// to the root of the distribution (where this script lives).

const requirejs = require('requirejs');

requirejs.config({
    nodeRequire: require,
	paths: {
		server: "js/server",
		game: "js/game",
		dawg: "js/dawg",

		// Server version of triggerEvent is a NOP (there is no event loop)
		triggerEvent: "js/server/triggerEvent"
	}
});

// Server exports the mainProgam function, so simply require it and
// run it.
requirejs(["server/Server"], main => main(__dirname));
