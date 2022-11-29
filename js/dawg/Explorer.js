/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

/**
 * AMD module defining the body of the 'explore' command-line program
 */
define([
  "platform",
  "dawg/Dictionary"
], (
  Platform,
  Dictionary
) => {

  /**
   *
   * The body of the `explore` command-line program
   */
  class Explorer {

    /**
     * Determine if the words passed are valid sub-sequences of any
     * word in the dictionary e.g. 'UZZL' is a valid sub-sequence in
     * an English dictionary as it is found in 'PUZZLE', but 'UZZZL'
     * isn't.
     * @param {Dictionary} dictionary dawg to explore
     * @param {string[]?} words list of words to check
     * @param {function} report reporter function, same signature as console.log
     */
    static sequences(dictionary, words, report) {
      assert(dictionary instanceof Dictionary, "Not a Dictionary");
      const valid = [];
      report(`Valid sequences:`);
      for (let w of words) {
        if (dictionary.hasSequence(w))
          report(w);
      }
    }

    /**
     * Find anagrams of the words that use all the letters. `.`
     * works as a character wildcard.
     * @param {Dictionary} dictionary dawg to explore
     * @param {string[]?} words list of words to check
     * @param {function} report reporter function, same signature as console.log
     */
    static anagrams(dictionary, words, report) {
      if (!words || words.length === 0)
        throw "Need letters to find anagrams of";

      for (const w of words) {
        console.log(w);
        let anag = Object.keys(dictionary.findAnagrams(w.replace(/\./g, " ")));
        anag = anag.filter(word => word.length === w.length);
        report(`${anag.length} words found in "${w}":`);
        anag.forEach(w => report(w));
      }
    }

    /**
     * Find anagrams of the letters of the words, including
     * sub-sequences of the letters e.g. `QI` is a sequence of the letters
     * in `QUIET`.
     * @param {Dictionary} dictionary dawg to explore
     * @param {string[]?} words list of words to check
     * @param {function} report reporter function, same signature as console.log
     */
    static arrangements(dictionary, words, report) {
      if (!words || words.length === 0)
        throw "Need letters to find anagrams of";

      for (const w of words) {
        let anag = Object.keys(dictionary.findAnagrams(w));
        report(`${anag.length} words found in "${w}":`);
        anag.forEach(w => report(w));
      }
    }

    /**
     * List all the words in the dictionary. If `words` is given,
     * list all dictionary entries that start with one of the words.
     * @param {Dictionary} dictionary dawg to explore
     * @param {string[]?} words list of words to check
     * @param {function} report reporter function, same signature as console.log
     */
    static list(dictionary, words, report) {
      if (!words || words.length === 0) {
        dictionary.eachWord((s, n) => report(s));
        return;
      }

      // Dump of words that match words
      const biglist = {};
      words.map(w => {
        const word = w.toUpperCase();
        const node = dictionary.match(word);
        if (node)
          return { word: word, node: node };
        return undefined;
      })
      .filter(r => r)
      .sort((a, b) => {
        return a.word.length > b.word.length ? -1 :
        a.word.length === b.word.length ? 0 : 1;
      })
      .map(root => {
        if (root.node.child) {
          let list = [];
          biglist[root.word] = true;
          root.node.child.eachWord(root.word, w => list.push(w));

          list = list.filter(w => !biglist[w]);
          list.forEach(w => biglist[w] = true);

          report(list.map(w => `${root.word} -- ${w}`).join("\n"));
        }
      });
    }
  }

  return Explorer;
});
