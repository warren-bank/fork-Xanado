/*Copyright (C) 2019-2022 Crawford Currie http://c-dot.co.uk. License MIT*/
/* eslint-env node */
/* global assert */

/**
 * Extension of node.js assert for use in unit tests
 */
assert = require("assert");
assert.why_is_node_running = require('why-is-node-running');

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
	const modules = Object.values(deps).map(f => Object.values(f)[0]);
	requirejs(modules, function() {
		let i = 0;
		for (let dep of deps) {
			const name = Object.keys(dep)[0];
			eval(`${name}=arguments[${i++}]`);
		}
		required();
	});
};

