/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

define([
  "fs", "dawg/Trie"
], (
  fs, Trie
) => {
  const Fs = fs.promises;

  /**
   * The body of the 'dictionary_compressor' command-line program
   */
  class Compressor {

    /**
     * Generate a compressed dictionary from the text file of words.
     * @param {string} infile file of words, one per line, # for comments
     * @param {string} outfile file for dictionary
     * @return {Promise} a promise to create the dictionary
     */
    static compress(infile, outfile, report) {
      //console.log("Compress",infile,"to",outfile);
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

        // Write DAWG binary bytes
        const dv = new DataView(buffer);
        return Fs.writeFile(outfile, dv)
        .then(() => report(`Wrote DAWG to ${outfile}`));
      })
      .catch(e => {
        report(e.toString());
      });
    }
  }

  return Compressor;
});
