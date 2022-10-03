/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* eslint-env node */

/**
 * Command-line program to generate a DAWG (Directed Acyclic Word Graph) from a
 * word lexicon. Generates a somewhat optimised Trie, encodes it in
 * an integer array, which it then gzips.
 *
 * `node js/dawg/dictionary_compressor.js` will tell you how to use it.
 * @module dictionary_compressor
 */

const requirejs = require("requirejs");

requirejs.config({
  baseUrl: `${__dirname}/../..`,
  paths: {
    dawg: `js/dawg`,
    common: "js/common",
    game: "js/game",
    server: "js/server",
    platform: "js/server/Platform"
  }
});

requirejs(["dawg/Compressor"], (Compressor) => {

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

  if (process.argv.length === 4) {
    const infile = process.argv[2];
    const outfile = process.argv[3];
    Compressor.compress(infile, outfile, console.log);
  } else
    console.log(DESCRIPTION.join("\n"));
});
