/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

/**
 * AMD module defining the body of the 'dictionary_compressor'
 * command-line program
 */
define([
  "fs", "node-gzip", "dawg/Trie"
], (
  fs, Gzip, Trie
) => {
  const Fs = fs.promises;

  class Compressor {

    /**
     * Generate a compressed dictionary from the text file of words.
     * @param {string} infile file of words, one per line, # for comments
     * @param {string} outfile file for zipped dictionary
     * @return {Promise} a promise to create the dictionary
     */
    static compress(infile, outfile, report) {
      return Fs.readFile(infile, "utf8")
      .then(async function(data) {
        const lexicon = data
              .toUpperCase()
              .split(/\r?\n/)
              .map(w => w.replace(/\s.*$/, "")) // comments
              .filter(line => line.length > 0)
              .sort();

        // First step; generate a Trie from the words in the lexicon
        const trie = new Trie(lexicon, report);

        // Second step; generate a DAWG from the Trie
        trie.generateDAWG();

        // Generate an integer array for use with Dictionary
        const buffer = trie.encode();
        const dv = new DataView(buffer);
        const z = await Gzip.gzip(dv);
        report(`Compressed ${z.length} bytes`);

        // Write DAWG binary bytes
        return Fs.writeFile(outfile, z)
        .then(() => report(`Wrote DAWG to ${outfile}`));
      })
      .catch(e => {
        report(e.toString());
      });
    }
  }

  return Compressor;
});
