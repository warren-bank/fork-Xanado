/* eslint-env node */
/* global DataView */

/**
 * Based on Appel & Jacobsen, with ideas from Weck and Toal. Not the
 * fastest, or the most efficient, but who cares? It works for us.
 */
const requirejs = require('requirejs');

// Second integer of node tuple is encoded
const END_OF_WORD_BIT_MASK = 0x1;
const END_OF_LIST_BIT_MASK = 0x2;
const CHILD_INDEX_SHIFT = 2;

let nodeIds = 0;

/**
 * A Trie/DAWG node.
 * Represents a letter in a set of words. The node may prepresent the end.
 * It has pointers to a child list representing the next letters that can
 * follow this letter, and a next pointer to the next alternative to this
 * letter in the child list of it's parent node.
 */
class Tnode {

	/**
	 * @param letter codepoint
	 * @param next next node pointer
	 * @param isWordEnding true if this is an end-of-word node
	 * @param starterDepth The maximum depth below this node before the
	 * end-of-word is reached, for the first word added
	 * @param isFirstChild is the first child of the parent node
	 */
	constructor(letter, next, isWordEnding, starterDepth, isFirstChild) {
		this.letter = letter; 
		this.next = next;
		this.isEndOfWord = isWordEnding;
		this.maxChildDepth = starterDepth;
		this.isFirstChild = isFirstChild;

		// first child node
		this.child = null;

		// optimisation for comparison
		this.numberOfChildren = 0;
		// will be set true if the node is to be pruned
		this.isPruned = false;
		// not assigned yet
		this.index = -1;

		this.id = nodeIds++;
	}

	toString() {
		let simpler = `{${this.id} ${this.letter}`;

		if (this.isEndOfWord)
			simpler + ".";
		if (this.child)
			simpler += "+";
		if (this.next)
			simpler += "-";

		return `${simpler}}`;
	}
	
	/**
	 * Mark a node as pruned, and recursively mark every node
	 * under and after it as well
	 * @return the total number of nodes pruned as a result
	 */
	prune() {
		if (this.isPruned)
			return 0;
		//console.log(`Prune ${this}`);
		this.isPruned = true;

		let result = 0;
		if (this.next)
			result += this.next.prune();
		if (this.child)
			result += this.child.prune();

		return result + 1;
	}

	/**
	 * Depth-first tree walk. Will visit ends of words in
	 * sorted lexicon order.
	 * @param nodes list of nodes visited
	 * @param cb callback function, takes list of nodes
	 */
	walk(nodes, cb) {

		nodes.push(this);

		if (this.isEndOfWord)
			cb(nodes);
			
		if (this.child)
			this.child.walk(nodes, cb);

		nodes.pop();
			
		if (this.next)
			this.next.walk(nodes, cb);
	}
	
	/**
	 * Search along this's child next chain for a node with the 
	 * given letter.
	 * @param thisLetter letter to look for
	 * @return the node found, or null
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
	 * @param thisLetter letter to add
	 * @param wordEnder true if this is the end of a word
	 * @param startDepth
	 */
	insertChild(thisLetter, wordEnder, startDepth) {
		this.numberOfChildren++;
		
		if (!this.child) {
			// child list does not exist yet
			this.child = new Tnode(
				thisLetter, null, wordEnder, startDepth, true);
			return;
		}

		if (this.child.letter > thisLetter) {
			// thisLetter should be the first in the child list
			this.child.isFirstChild = false;
			this.child = new Tnode(
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
		child.next = new Tnode(
			thisLetter, child.next, wordEnder, startDepth, false);
	}

	/**
	 * Determine if this and other are the parent nodes
	 * of equal Trie branches.
	 */
	sameSubtrie(other) {
		if (other === this) // identity
			return true;
		
		if (other === null
			|| other.letter !== this.letter
			|| other.maxChildDepth !== this.maxChildDepth
			|| other.numberOfChildren !== this.numberOfChildren
			|| other.isEndOfWord !== this.isEndOfWord
			|| this.child === null && other.child !== null
			|| this.child !== null && other.child === null
			|| this.next === null && other.next !== null
			|| this.next !== null && other.next === null)
			return false;
	
		if (this.child != null && !this.child.sameSubtrie(other.child))
			return false;

		if (this.next != null && !this.next.sameSubtrie(other.next))
			return false;
		
		return true;
	}

	/**
	 * Returns the first node in the red[maxChildDepth], that is
	 * identical to "this". If the function returns 'this'
	 * then it is the first of its kind in the
	 * Trie.
	 */
	findSameSubtrie(red) {
		//return red[this.maxChildDepth].find(n => this.sameSubtrie(n));
		let x;
		for (x = 0; x < red[this.maxChildDepth].length; x++)
			if (this.sameSubtrie(red[this.maxChildDepth][x]))
				break;
		if (red[this.maxChildDepth][x].isPruned)
			throw Error("Same subtrie equivalent is pruned!");
		return red[this.maxChildDepth][x];
	}

	/**
	 * Recursively replaces all redundant nodes in a trie with their
	 * first equivalent.
	 * @param red reduction structure
	 */
	replaceRedundantNodes(red) {

		if (!this.next && !this.child)
			// Leaf node
			return 0;

		let trimmed = 0;
		if (this.child) {
			if (this.child.isPruned) {
				//console.log(`Trimming ${this.child}`);
				// we have found a node that has been tagged for
				// as pruned, so let us replace it with its first
				// equivalent which isn't tagged.
				this.child = this.child.findSameSubtrie(red);
				if (this.child === null)
					throw Error("Something horrible");
				trimmed++;
			} else
				trimmed += this.child.replaceRedundantNodes(red);
		}
			
		// Traverse the rest of the "Trie", but a "Tnode" that is
		// not a direct child will never be directly replaced.
		// This will allow the resulting "Dawg" to fit into a
		// contiguous array of node lists.
		if (this.next)
			trimmed += this.next.replaceRedundantNodes(red);

		return trimmed;
	}

	/**
	 * Encode the node in a pair of integers. Requires node indices to have
	 * been established.
	 */
	encode(array) {
		array.push(this.letter.codePointAt(0));
		let numb = 0;
		if (this.child)
			numb |= (this.child.index << CHILD_INDEX_SHIFT);
		if (this.isEndOfWord)
			numb |= END_OF_WORD_BIT_MASK;
		if (!this.next)
			numb |= END_OF_LIST_BIT_MASK;
		array.push(numb);
	}
}

class Trie {

	/**
	 * Construct a Trie from a simple word list
	 */
	constructor(lexicon) {
		console.log("\nConstruct Trie and fill from lexicon");

		this.numberOfWords = 0;
		this.numberOfNodes = 0;
		this.first = new Tnode(-1, null, false, 0, 0, null, false);
		this.maxWordLen = 0;
		this.minWordLen = 1000000;
		
		for (let word of lexicon)
			this.addWord(word);

		console.log(`Trie of ${this.numberOfNodes} nodes built from ${this.numberOfWords} words`);
	}

	/**
	 * Add a word to the Trie
	 * @param word string
	 */
	addWord(word) {
		let current = this.first;
		let nNew = 0;
		for (let x = 0; x < word.length; x++) {
			let hangPoint = current.child ?
				current.findChild(word[x]) : null;
			
			if (!hangPoint) {
				current.insertChild(
					word[x], x === word.length - 1, word.length - x - 1);
				nNew++;
				current = current.findChild(word[x]);
				for (let y = x + 1; y < word.length; y++) {
					current.insertChild(
						word[y], y === word.length - 1, word.length - y - 1);
					nNew++;
					current = current.child;
				}
				break;
			}
			if (hangPoint.maxChildDepth < word.length - x - 1)
				hangPoint.maxChildDepth = word.length - x - 1;
			current = hangPoint;
			// The path for the word that we are trying to insert
			// already exists, so just make sure that the end flag is
			// flying on the last node.  This should never happen if
			// words are added in alphabetical order, but this is not
			// a requirement.
			if (x === word.length - 1) {
				console.log(`WARNING input not in alphabetical order ${word}`);
				current.isEndOfWord = true;
			}
		}
		this.numberOfNodes += nNew;
		this.numberOfWords++;
	}

	/**
	 * Construct an array indexed on maxChildDepth (word length)
	 * Each entry is an array that contains all the nodes with that
	 * maxChildDepth.
	 * @return the structure
	 */
	createReductionStructure() {
		console.log("\nCreate reduction structure");

		let counts = [];
		for (let x = this.minWordLen; x < this.maxWordLen; x++)
			counts[x] = 0;

		let red = [];
		let queue = [];
		let current = this.first.child;
		while (current) {
			queue.push(current);
			current = current.next;
		}

		let added = 0;
		while (queue.length > 0) {
			current = queue.shift();
			if (!red[current.maxChildDepth])
				red[current.maxChildDepth] = [];
			red[current.maxChildDepth].push(current);
			counts[current.maxChildDepth]++;
			added++;
			current = current.child;
			while (current) {
				queue.push(current);
				current = current.next;
			}
		}

		for (let x = this.minWordLen; x < this.maxWordLen; x++)
			if (counts[x] > 0)
				console.log(`${counts[x]} words of length ${x}`);

		console.log(`${added} nodes added to the reduction structure`);

		return red;
	}

	/**
	 * Flag all of the redundant nodes in the Trie
	 * Flagging requires the node comparison function that will take a
	 * very long time for a big dictionary.  This is especially true
	 * when comparing the nodes with small "maxChildDepth"'s because
	 * there are so many of them.  It is faster to start with nodes of
	 * the largest "maxChildDepth" to recursively reduce as many lower
	 * nodes as possible.
	 */
	findPrunedNodes(red) {
		console.log("\nMark redundant nodes as pruned");
		
		// Use recursion because only direct children are considered for
		// elimination to keep the remaining lists intact. Start at
		// the largest "maxChildDepth" and work down from there for
		// recursive reduction to take place early on to reduce the work
		// load for the shallow nodes.
		let totalPruned = 0;
		for (let y = red.length - 1; y >= 0 ; y--) {
			let numberPruned = 0;
			// Move through the red array from the beginning, looking
			// for any nodes that have not been pruned, these will be the
			// surviving nodes.
			// Could equally use for (w in readArray[y])
			// but this is a useful check
			let nodesAtDepth = red[y];
			for (let w = 0; w < nodesAtDepth.length - 1; w++) {
				if (nodesAtDepth[w].isPruned)
					// The Node is already pruned.  Note that this node need
					// not be the first in a child list, it could have been
					// pruned recursively.  In order to eliminate the need
					// for the "next" index, the nodes at the root of
					// elimination must be the first in a list, in other
					// words, "isFirstChild". The node that we replace the
					// "isFirstChild" node with can be located at any position.
					continue;

				// Traverse the rest of the list looking for equivalent
				// nodes that are both not pruned and are tagged as
				// first children.  When we have found an identical list
				// structure further on in the array, prune it, and all
				// the nodes coming after, and below it.
				for (let x = w + 1; x < nodesAtDepth.length; x++) {
					if (!nodesAtDepth[x].isPruned
						&& nodesAtDepth[x].isFirstChild) {
						if (nodesAtDepth[w].sameSubtrie(nodesAtDepth[x])) {
							numberPruned += nodesAtDepth[x].prune();
						}
					}
				}
			}
			console.log(`Pruned |${numberPruned}| nodes at depth |${y}|`);
			totalPruned += numberPruned;
		}
		
		console.log(`Identified a total of ${totalPruned} nodes for pruning`);
	}
	
	/**
	 * Label all of the remaining nodes in the Trie-Turned-DAWG so that
	 * they will fit contiguously into an unsigned integer array.
	 * @return all the nodes in the order they are indexed
	 */
	assignIndices() {

		console.log("\nAssign node indices");
		let current = this.first.child;
		let queue = [];
		let nodeList = [];
		
		// The use of a queue during this step ensures that
		// lists of contiguous nodes in the array will eliminate the need
		// for a Next pointer.
		while (current) {
			queue.push(current);
			current = current.next;
		}

		let nextIndex = 0;
		while (queue.length > 0) {
			current = queue.shift();
			// If the node already has a non-zero index, don't give it a new one.
			// if it has an index, all it's next and child nodes should too.
			if (current.index < 0) {
				current.index = nextIndex++;
				nodeList.push(current);
				current = current.child;
				while (current) {
					queue.push(current);
					current = current.next;
				}
			}
		}

		console.log(`Assigned ${nextIndex} node indexes`);
		
		return nodeList;
	}

	/**
	 * Go through the steps to 
	 */
	generateDAWG() {

		let red = this.createReductionStructure();

		this.findPrunedNodes(red);

		// Pruning is complete, so replace all pruned nodes with their
		// first equivalent in the Trie
		let trimmed = this.first.child.replaceRedundantNodes(red);
		console.log(`Pruned ${trimmed} nodes`);

		return red;
	}

	/**
	 * Convert a DAWG expressed as a network of Trie nodes into a
	 * linear 32-bit integer array.
	 * @return array of integers
	 */
	encodeDAWG() {
		console.log("\nGenerate the unsigned integer array");

		let nodelist = this.assignIndices();
		
		// Debug
		//console.log("\nRegenerate lexicon with indidices");
		//this.first.child.walk([], nodes => {
		//	let w = nodes.map(n => {
		//		let s = n.letter;
		//		s += `(${n.index})`;
		//		if (n.isEndOfWord)
		//			s += '.';
		//		return s;
		//	}).join("");
		//	console.log(w);
		//});

		if (nodelist.length > 0x3FFFFFFF)
			throw Error(`Too many nodes remain for integer encoding`);

		let dawg = [ nodelist.length ];
		// Add nodes
		for (let i = 0; i < nodelist.length; i++)
			nodelist[i].encode(dawg);
		
		console.log(`${dawg.length} integer array generated`);
		
		return dawg;
	}
}

const DESCRIPTION = "USAGE\n"
	  + "node DAWG_Compressor.js [options] <lexicon> <outfile>\n"
	  + "Create a directed acyclic word graph (DAWG) from a list of words.\n"
	  + "<lexicon> is a text file containing a list of words, and <outfile>\n"
	  + "is the binary file containing the compressed DAWG, as used by the\n"
	  + "Dictionary.js module.\n"

const OPTIONS = [
    ["l", "length=ARG", "Maximum length over which to ignore words. 15 is usual for word games such as Scrabble. No limit if omitted."]
];

requirejs.config({
	paths: {
		game: `${__dirname}/js/game` // for Dictionary
	}
});

requirejs(["node-getopt", "fs-extra", 'node-gzip'], (Getopt, Fs, Gzip) => {
	let opt = new Getopt(OPTIONS)
		.bindHelp()
		.setHelp(DESCRIPTION + "\nOPTIONS\n[[OPTIONS]]")
		.parseSystem();
	
	if (opt.argv.length < 2) {
		opt.showHelp();
		throw "Both <infile> and <outfile> are required";
	}

	let infile = opt.argv[0];
	let outfile = opt.argv[1];

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
	});
});
