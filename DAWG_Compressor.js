/* See README.md at the root of this distribution for copyright and
   license information */

/* eslint-env node */
/* global DataView */

/**
 * Generate a DAWG (Directed Acyclic Word Graph) from a word lexicon.
 * Generates a somewhat optimised Trie, encodes it in an integer array,
 * then gzips the result.
 *
 * Based on Appel & Jacobsen, with ideas from Weck and Toal. Not the
 * fastest, or the most efficient, but who cares? It works.
 */
const requirejs = require('requirejs');

requirejs.config({
	paths: {
		dawg: `${__dirname}/js/dawg`,
		game: `${__dirname}/js/game` // for Dictionary
	}
});

requirejs(["fs-extra", 'node-gzip', 'dawg/Trie'], (Fs, Gzip, Trie) => {
	const DESCRIPTION = [
		"USAGE",
		`node ${process.argv[1].replace(/.*\//, "")} <lexicon> <outfile>`,
		"Create a directed acyclic word graph (DAWG) from a list of words.",
		"<lexicon> is a text file containing a list of words, and <outfile>",
		"is the binary file containing the compressed DAWG, as used by the",
		"Dictionary.js module." ];

	if (process.argv.length < 4) {
		console.log(DESCRIPTION.join("\n"));
		return;
	}

	let infile = process.argv[2];
	let outfile = process.argv[3];

	Fs.readFile(infile)
	.then(async function(data) {
		let lexicon = data
			.toString()
			.toUpperCase()
			.split(/\r?\n/)
			.map(w => w.replace(/[\W].*$/, "")) // comments
			.sort();

		// First step; generate a Trie from the words in the lexicon
		let trie = new Trie(lexicon);

		// Second step; generate a graph from the tree
		trie.generateDAWG();
		
		// We have a DAWG. We could output it now like this:
		//console.log(JSON.stringify(trie.first.simplify(), null, " "));

		// Instead we want to generate an integer array for use with Dictionary
		// let dawg = trie.generateIntegerArray(red);
		let dawg = trie.encodeDAWG();

		// Pack the array of encoded integers into an ArrayBuffer
		let buffer = new ArrayBuffer(dawg.length * 4);
		let dv = new DataView(buffer);
		for (let i = 0; i < dawg.length; i++) {
			dv.setUint32(i * 4, dawg[i]); // Little endian
		}
		console.log(`Uncompressed ${dawg.length * 4} bytes`);

		const z = await Gzip.gzip(dv);
		console.log(`Compressed ${z.length} bytes`);

		// Debug
		//console.log("Validate that dictionary regenerates lexicon");
		//let ub = await Gzip.ungzip(z);
		//console.log(`Uncompressed ${ub.length}`);
		//let dict = new Dictionary(ub.buffer);
		//dict.walk(w => console.log(w));

		// Write DAWG binary bytes
		return Fs.writeFile(outfile, z)
		.then(() => console.log(`Wrote DAWG to ${outfile}`));
	})
	.catch(e => {
		console.log(e.toString());
		console.log(DESCRIPTION.join("\n"));
	});
});
