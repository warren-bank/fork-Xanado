/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env amd, node */

define("dawg/LetterNode", () => {

	/**
	 * Letter node in a Dictionary. Each node has multiple links and helpers
	 * that trade off space for performance during word searches.
	 * Each LetterNode participates in two linked lists; the `next` pointer
	 * points to the next alternative to this letter when composing a word,
	 * while the `child` pointer points to the first in a chain of possible
	 * child nodes. For example, in a dictionary where we have the two words
	 * `NO`, `SO` and `SAD`:
	 * ```
	 *   N -next-> S -next->
     *   |         |
     * child     child
     *   |         |
     *   `-> O(e)  `-> A -next-> O(e)
     *                 |
     *               child
     *                 |
     *                 D(e)
	 * ```
	 * where (e) indicates a node that is a valid end-of-word.
     * The example is a tree; however the DAWG compressor will
	 * collapse letter sequences that are common to several words,
	 * to create a more optimal DAG.
	 *
	 * Once a Dictionary has been created and fully populated, it can be
	 * processed using `buildLists` to generate lists that support rapid
	 * navigation through the DAG without needing to traverse the node
	 * chains.
	 */
	class LetterNode {
		constructor(letter) {
			/**
			 * The letter at this node
			 * @member {string}
			 */
			this.letter = letter;

			/**
			 * Pointer to the next (alternative) node in this peer chain
			 * @member {LetterNode}
			 */
			this.next = null;

			/**
			 * Pointer to the head of the child chain
			 * @member {LetterNode}
			 */
			this.child = null;

			/**
			 * Is this the end of a valid word?
			 * @name LetterNode#isEndOfWord
			 * @type boolean
			 */
			let isEndOfWord;

			/**
			 * List of nodes that link forward to this node. Set up
			 * by {@link LetterNode#buildLists}.
			 * @name LetterNode#pre
			 * @type LetterNode[]?
			 */
			let pre;

			/**
			 * List of letters that are in the nodes listed in `pre`.
			 * Set up by {@link LetterNode#buildLists}.
			 * @name LetterNode#preLetters
			 * @type string[]?
			 */
			let preLetters;
			
			/**
			 * List of letters that are in the nodes listed in `post`.
			 * Set up by {@link LetterNode#buildLists}.
			 * @name LetterNode#postLetters
			 * @type LetterNode[]?
			 */
			let postLetters;

			/**
			 * List of nodes that are linked to from this node. Set up
			 * by {@link LetterNode#buildLists}.
			 * @name LetterNode#post
			 * @type LetterNode[]?
			 */
			let post;
		}

		/**
		 * @callback LetterNode~wordCallback
		 * @param {string} word found
		 * @param {LetterNode} node node where word was terminated
		 */

		/**
		 * Enumerate each word in the dictionary. Calls cb on each word.
		 * Caution this is NOT the same as dawg/TrieNode.eachWord.
		 * @param {string} s the word constructed so far
		 * @param {LetterNode~wordCallback} cb the callback
		 */
		eachWord(s, cb) {
			if (this.isEndOfWord)
				cb(s + this.letter, this);

			if (this.child)
				this.child.eachWord(s + this.letter, cb);

			if (this.next)
				this.next.eachWord(s, cb);
		}

		/**
		 * Enumerate each LONG word in the dictionary. A long word is one
		 * that has no child nodes i.e. cannot be extended by adding more
		 * letters to create a new word. Calls cb on each word.
		 * Caution this is NOT the same as dawg/TrieNode.eachWord.
		 * @param {string} s the word constructed so far
		 * @param {wordCallback} cb the callback
		 */
		eachLongWord(s, cb) {
			if (this.isEndOfWord && !this.child)
				cb(s + this.letter, this);

			if (this.child)
				this.child.eachLongWord(s + this.letter, cb);

			if (this.next)
				this.next.eachLongWord(s, cb);
		}

		/**
		 * @callback LetterNode~nodeCallback
		 * @param {LetterNode} node node
		 * @return {boolean} true to continue the iteration, false to stop it.
		 */

		/**
		 * Enumerate each node in the dictionary in depth-first order.
		 * Calls cb on each node.
		 * @param {LetterNode~nodeCallback} cb the callback
		 */
		eachNode(cb) {
			if (!cb(this))
				return false;

			if (this.child && !this.child.eachNode(cb))
				return false;

			if (this.next && !this.next.eachNode(cb))
				return false;

			return true;
		}

		/**
		 * Add a letter sequence to this node. This is used to add
		 * whitelist nodes to a DAG.
		 * @param {string} word word being added
		 */
		add(word) {
			if (this.letter === word.charAt(0)) {
				if (word.length === 1)
					this.isEndOfWord = true;
				else {
					const subword = word.substring(1);
					if (!this.child)
						this.child = new LetterNode(subword.charAt(0));
					this.child.add(subword);
				}
				return;
			}
			if (!this.next || this.next.letter > word.charAt(0)) {
				const t = this.next;
				this.next = new LetterNode(word.charAt(0));
				this.next.next = t;
			}
			this.next.add(word);
		}

		/**
		 * Build forward and backward lists to allow us to navigate
		 * in both directions - forward through words, and backwards too.
		 * This has to be done from the root of the DAG.
		 */
		buildLists(nodeBefore) {
			this.preNodes = [];
			this.preLetters = [];
			this.postNodes = [];
			this.postLetters = [];
			if (nodeBefore) {
				this.preNodes.push(nodeBefore);
				this.preLetters.push(nodeBefore.letter);
				nodeBefore.postNodes.push(this);
				nodeBefore.postLetters.push(this.letter);
			}
			if (this.child)
				this.child.buildLists(this);
			if (this.next)
				this.next.buildLists(nodeBefore);
		}

		/**
		 * Return the LetterNode that matches the last character
		 * in chars, even if it"s not isEndOfWord
		 * @param {string} chars a string of characters that may
		 * be the root of a word
		 * @param {number} index the start index within partialWord
		 * @return {LetterNode} node found, or undefined
		 */
		match(chars, index) {
			if (typeof index === "undefined")
				index = 0;
			let node = this;
			while (node) {
				if (node.letter === chars[index]) {
					if (index === chars.length - 1)
						return node;
					if (node.child)
						return node.child.match(chars, index + 1);
				}
				node = node.next;
			}
			return null;
		}

		/**
		 * @param {string} realWord the string built so far in this recursion
		 * @param {string} blankedWord the string built using spaces for blanks
		 * if they are used
		 * @param {string} sortedChars the available set of characters, sorted
		 * @param {string[]} foundWords list of words found
		 */
		findAnagrams(realWord, blankedWord, sortedChars, foundWords) {

			// is this character available from sortedChars?
			// Only use blank if no other choice
			let i = sortedChars.indexOf(this.letter);
			if (i < 0) // not there, try blank
				i = sortedChars.indexOf(" ");

			if (i >= 0) {
				const match = sortedChars[i];

				// The char is available from sortedChars.
				// Is this then a word?
				if (this.isEndOfWord) {
					// A word is found
					foundWords[realWord + this.letter] = blankedWord + match;
				}

				if (sortedChars.length == 1)
					return;

				// Cut the matched letter out of sortedChars and recurse
				// over our child node chain
				sortedChars.splice(i, 1);

				for (let child = this.child; child; child = child.next) {
					child.findAnagrams(
						realWord + this.letter,
						blankedWord + match,
						sortedChars,
						foundWords);
				}
				sortedChars.splice(i, 0, match);
			}

			if (this.next)
				this.next.findAnagrams(
					realWord, blankedWord, sortedChars, foundWords);
		}
	}

	return LetterNode;
});
