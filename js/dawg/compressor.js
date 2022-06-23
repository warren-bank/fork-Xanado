/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* eslint-env node */

/**
 * Command-line program to generate a DAWG (Directed Acyclic Word Graph) from a
 * word lexicon. Generates a somewhat optimised Trie, encodes it in
 * an integer array, which it then gzips.
 *
 * Based on Appel & Jacobsen, with ideas from Weck and Toal. Not the
 * fastest, or the most efficient, but who cares? It works.
 *
 * `node js/dawg/compressor.js` will tell you how to use it.
 * @module
 */

const requirejs = require("requirejs");

requirejs.config({
	baseUrl: `${__dirname}/../..`,
	paths: {
		dawg: `js/dawg`
	}
});

requirejs(["fs", "node-gzip", "dawg/Trie"], (fs, Gzip, Trie) => {
	const Fs = fs.promises;

	const DESCRIPTION = [
		"USAGE",
		`node ${process.argv[1].replace(/.*\//, "")} <lexicon> <outfile>`,
		"Create a directed acyclic word graph (DAWG) from a list of words.",
		"<lexicon> is a text file containing a list of words, and <outfile>",
		"is the binary file containing the compressed DAWG, as used by the",
		"Dictionary.js module.\n",
		"The lexicon is a simple list of case-insensitive words, one per line",
		"Anything after a space character on a line is ignored."
	];

	if (process.argv.length < 4) {
		console.log(DESCRIPTION.join("\n"));
		return;
	}

	const infile = process.argv[2];
	const outfile = process.argv[3];

	Fs.readFile(infile, "utf8")
	.then(async function(data) {
		const lexicon = data
			    .toUpperCase()
			    .split(/\r?\n/)
			    .map(w => w.replace(/\s.*$/, "")) // comments
			    .filter(line => line.length > 0)
			    .sort();

		// First step; generate a Trie from the words in the lexicon
		const trie = new Trie(lexicon, console.debug);

		// Second step; generate a DAWG from the Trie
		trie.generateDAWG();
		
		// Generate an integer array for use with Dictionary
		const buffer = trie.encode();
		const dv = new DataView(buffer);
		const z = await Gzip.gzip(dv);
		console.log(`Compressed ${z.length} bytes`);

		// Write DAWG binary bytes
		return Fs.writeFile(outfile, z)
		.then(() => console.log(`Wrote DAWG to ${outfile}`));
	})
	.catch(e => {
		console.log(e.toString());
		console.log(DESCRIPTION.join("\n"));
	});
});
