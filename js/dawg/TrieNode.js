/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env amd, node */

define("dawg/TrieNode", [
    "common/Debuggable", "dawg/LetterNode"
], (Debuggable, LetterNode) => {

	let nodeIds = 0;

	/**
	 * A Trie/DAWG node.
	 * Represents a letter in a set of words.  It has pointers to a
	 * child list representing the next letters that can follow this
	 * letter, and a next pointer to the next alternative to this
	 * letter in the child list of it's parent node.  Note this is
	 * only used while generating a DAWG from a lexicon. TrieNodes are
	 * serialised using the above structure but are then rebuilt using
	 * {@link LetterNode}s at the sharp end.
     * @extends Debuggable
	 */
	class TrieNode extends Debuggable {
        /**
         * The letter at this node
         * @member {string}
         */
        letter = undefined;

        /**
         * Unique ID for this node, purely used for debugging
         * @member {number}
         */
        id = -1;

        /**
         * Pointer to the next alternative to this letter
         * @member {TrieNode}
         */
        next = null;

        /**
         * Pointer to the first next letter if this letter is matched
         * @member {TrieNode}
         */
        child = null;

        /**
         * Marker for a valid end-of-word node
         * @member {boolean}
         */
        isEndOfWord = false;

        /**
         * Marker for the first child under a parent node. This is
         * used when the node is arrived at other than through the
         * parent
         * @member {boolean}
         */
        isFirstChild = false;

        /**
         * Will be set if the node is to be pruned after DAWG generation
         * @member {boolean}
         */
        isPruned = false;

        /**
         * Maximum number of nodes under this node (iei remaining length
         * of the longest word this node partiipates in)
         * @member {number}
         */
        maxChildDepth = 0;
        
        /**
         * Number of child nodes under this node - used for optimisation
         * @member {number}
         */
        numberOfChildren = 0;

        /**
         * Index of the node in the encoded DAWG, assigned when the
         * encoding is generated
         * @member {number}
         */
        index = -1;
        
		/**
		 * @param {string} letter codepoint
		 * @param {TrieNode} next next node pointer
		 * @param {boolean} isWordEnding true if this is an end-of-word node
		 * @param {number} starterDepth The maximum depth below this
		 * node before the end-of-word is reached, for the first word
		 * added
		 * @param {boolean} isFirstChild is the first child of the parent node
		 */
		constructor(letter, next, isWordEnding, starterDepth, isFirstChild) {
			this.letter = letter; 
			this.next = next;
			this.isEndOfWord = isWordEnding;
			this.maxChildDepth = starterDepth;
			this.isFirstChild = isFirstChild;
			this.id = nodeIds++;
		}

        /**
         * Debug
         * @param {boolean} deeply true to expand child nodes
         */
		toString(deeply) {
			let simpler = `{${this.id} ${this.letter}`;

			if (this.isEndOfWord)
				simpler += ".";
			if (this.child) {
				simpler += "+";
                if (deeply)
                    simpler += this.child.toString(deeply);
            }
            simpler += "}";
			if (this.next) {
				simpler += "-";
                if (deeply)
                    simpler += this.next.toString(deeply);
            }

			return simpler;
		}

		/**
		 * Mark a node as pruned, and recursively mark every node
		 * under and after it as well
		 * @return {number} the total number of nodes pruned as a result
		 */
		prune() {
			//console.debug(`Pruning ${this}`);
			this.isPruned = true;

			let result = 0;
			if (this.next)
				result += this.next.prune();

			if (this.child)
				result += this.child.prune();

			return result + 1;
		}

		/**
		 * @callback TrieNode~wordCallback
		 * @param {TrieNode} nodes list of nodes on the path
		 * from the root to the end of the word
		 */

		/**
		 * Depth-first tree walk. Will visit ends of words in
		 * sorted order.
		 * @param {TrieNode[]} nodes list of nodes visited to create the word
		 * @param {TrieNode~wordCallback} cb callback function
         * @private
		 */
		eachWord(nodes, cb) {

			nodes.push(this);

			if (this.isEndOfWord)
				cb(nodes);

			if (this.child)
				this.child.eachWord(nodes, cb);

			nodes.pop();

			if (this.next)
				this.next.eachWord(nodes, cb);
		}

        eachNode(cb) {
            cb(this);
            if (this.next)
                this.next.eachNode(cb);
            if (this.child)
                this.child.eachNode(cb);
        }

		/**
		 * Search along this's child next chain for a node with the 
		 * given letter.
		 * @param {string} thisLetter letter to look for
		 * @return {TrieNode} the node found, or null
		 */
		findChild(thisLetter) {
			let result = this.child;
			while (result) {
				if (result.letter === thisLetter)
					return result;
				if (result.letter > thisLetter)
					break;
				result = result.next;
			}
			return null;
		}

		/**
		 * Insert a letter in the child list of this node. The child
		 * list is sorted on letter
		 * @param {string} thisLetter letter to add
		 * @param {boolean} wordEnder true if this is the end of a word
		 * @param {number} startDepth depth of shallowest node
		 */
		insertChild(thisLetter, wordEnder, startDepth) {
			this.numberOfChildren++;

			if (!this.child) {
				// child list does not exist yet
				this.child = new TrieNode(
					thisLetter, null, wordEnder, startDepth, true);
				return;
			}

			if (this.child.letter > thisLetter) {
				// thisLetter should be the first in the child list
				this.child.isFirstChild = false;
				this.child = new TrieNode(
					thisLetter, this.child, wordEnder, startDepth, true);
				return;
			}

			// thisLetter is not the first in the list
			let child = this.child;
			while (child.next) {
				if (child.next.letter > thisLetter)
					break;
				child = child.next;
			}
			child.next = new TrieNode(
				thisLetter, child.next, wordEnder, startDepth, false);
		}

		/**
		 * Determine if this and other are the parent nodes
		 * of equal Trie branches.
		 * @param {TrieNode} other other tree to compare
		 * @return {boolean} if the are the same
		 */
		sameSubtrie(other) {
            //console.debug("CMP",this.toString(), !other ? "null" : other.toString());
			if (other === this) // identity
				return true;

			if (other === null
				|| other.letter !== this.letter
				|| other.maxChildDepth !== this.maxChildDepth
				|| other.numberOfChildren !== this.numberOfChildren
				|| other.isEndOfWord !== this.isEndOfWord
				|| !this.child && other.child
				|| this.child && !other.child
				|| !this.next && other.next
				|| this.next && !other.next)
				return false;

			if (this.child && !this.child.sameSubtrie(other.child))
				return false;

			if (this.next && !this.next.sameSubtrie(other.next))
				return false;

			return true;
		}

		/**
		 * Returns the first node in the red[maxChildDepth], that is
		 * identical to 'this'. If the function returns 'this'
		 * then it is the first of its kind in the
		 * Trie.
		 * @param {TrieNode[][]} red reduction structure
		 * @return {TrieNode}
         * @private
		 */
		findSameSubtrie(red) {
			//return red[this.maxChildDepth].find(n => this.sameSubtrie(n));
			let x;
			for (x = 0; x < red[this.maxChildDepth].length; x++)
				if (this.sameSubtrie(red[this.maxChildDepth][x]))
					break;
            /* istanbul ignore if */
			if (red[this.maxChildDepth][x].isPruned)
				throw Error("Same subtrie equivalent is pruned!");
			return red[this.maxChildDepth][x];
		}

		/**
		 * Recursively replaces all redundant nodes in a trie with their
		 * first equivalent.
		 * @param {TrieNode[][]} red reduction structure
		 * @return {number} no of nodes replaced
		 */
		replaceRedundantNodes(red) {

			if (!this.next && !this.child)
				// Leaf node
				return 0;

			let trimmed = 0;
			if (this.child) {
				if (this.child.isPruned) {
					//console.debug(`Trimming ${this.child}`);
					// we have found a node that has been tagged for
					// as pruned, so let us replace it with its first
					// equivalent which isn't tagged.
					this.child = this.child.findSameSubtrie(red);
                    /* istanbul ignore if */
					if (this.child === null)
						throw Error("Something horrible");
					trimmed++;
				} else
					trimmed += this.child.replaceRedundantNodes(red);
			}

			// Traverse the rest of the 'Trie', but a 'TrieNode' that is
			// not a direct child will never be directly replaced.
			// This will allow the resulting 'Dawg' to fit into a
			// contiguous array of node lists.
			if (this.next)
				trimmed += this.next.replaceRedundantNodes(red);

			return trimmed;
		}

		/**
		 * Encode the node in a pair of integers. Requires node indices to have
		 * been established.
		 * @return {number[]} array with the 2-integer encoding
		 */
		encode() {
			const array = [ this.letter.codePointAt(0) ];
			let numb = 0;
			if (this.child)
				numb |= (this.child.index << LetterNode.CHILD_INDEX_SHIFT);
			if (this.isEndOfWord)
				numb |= LetterNode.END_OF_WORD_BIT_MASK;
			if (!this.next)
				numb |= LetterNode.END_OF_LIST_BIT_MASK;
			array.push(numb);
            return array;
		}
	}

	return TrieNode;
});
