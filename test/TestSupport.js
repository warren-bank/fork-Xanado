/*Copyright (C) 2019-2022 Crawford Currie http://c-dot.co.uk. License MIT*/
/* eslint-env node */
/* global assert */

/**
 * Unit test support
 */
requirejs = require("requirejs");

// node.js
const { JSDOM } = require('jsdom');
/* eslint-disable no-global-assign */
document = new JSDOM('<!doctype html><html><body id="working"></body></html>');
/* eslint-enable no-global-assign */
const { window } = document;
global.window = window;
global.document = window.document;
global.navigator = { userAgent: "node.js" };
const jQuery = require('jquery');
global.jQuery = jQuery;
global.$ = jQuery;

requirejs.config({
    baseUrl: `${__dirname}/..`,
	nodeRequire: require,
	paths: {
		"jquery-ui": "node_modules/jquery-ui-dist/jquery-ui",
		common: "js/common",
		game: "js/game",
		dawg: "js/dawg",
		server: "js/server",
		platform: "js/server/ServerPlatform"
	}
});

assert = require("assert");
exports.why_is_node_running = require('why-is-node-running');

exports.sparseEqual = (actual, expected, path) => {
	if (!path) path = "";
	for (let f in expected) {
		const spath = `${path}->${f}`;
		if (typeof expected[f] === "object")
			exports.sparseEqual(actual[f], expected[f], spath);
		else
			assert.equal(actual[f], expected[f], spath);
	}
};

exports.assert = assert;

exports.depend = (required, deps) => {
	deps.push({ TestSocket: 'test/TestSocket' });
	deps.push({ Types: 'game/Types' });
	deps.push({ Platform: 'platform' });
	const modules = Object.values(deps).map(f => Object.values(f)[0]);
	requirejs(modules, function() {
		let i = 0;
		for (let dep of deps) {
			const name = Object.keys(dep)[0];
			eval(`${name}=arguments[${i++}]`);
		}
        for (let t of Object.keys(Types)) {
			eval(`${t}=Types.${t}`);
        }
		// Why? No idea, except without it, it won't work in
		// npm run
		global.document = window.document;
        
        Platform.i18n().load("en-GB").then(required);
	});
};

