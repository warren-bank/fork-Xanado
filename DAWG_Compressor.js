/**
 * Based on Appel & Jacobsen. Not the fastest, but who cares?
 */
const requirejs = require('requirejs');

// Second integer of node tuple is encoded
const END_OF_WORD_BIT_MASK = 0x1;
const END_OF_LIST_BIT_MASK = 0x2;
const CHILD_INDEX_SHIFT = 2;

class Tnode {

	/**
	 * @param letter codepoint
	 * @param next next node pointer
	 * @param is WordEnding true if this is an end-of-word node
	 * @param level depth of node from the root
	 * @param starterDepth The maximum depth below this node before the
	 * end-of-word is reached, for the first word added
	 * @param parent the parent node
	 * @param isAChild is the first child of the parent
	 */
	constructor(letter, next, isWordEnding, level, starterDepth, parent, isFirstChild) {
		this.letter = letter; 
		this.numberOfChildren = 0;
		this.maxChildDepth = starterDepth;
		this.next = next;
		this.parent = parent;
		this.isEndOfWord = isWordEnding;
		this.level = level;
		this.isFirstChild = isFirstChild;

		// first child node
		this.child = null;

		// will be set true if the node is to be pruned
		this.isPruned = false;
		// not assigned yet
		this.index = -1; 
	}

	toString() {
		return `${this.letter} ${this.maxChildDepth}`;
	}
	
	/**
	 * DEBUG Make a simpler version of the node for debug
	 */
	simplify() {
		let simpler = {
			l: this.letter
		};
		if (this.child)
			simpler.c = this.child.simplify();
		if (this.next)
			simpler.n = this.next.simplify();
		if (this.isEndOfWord)
			simpler.e = true;

		return simpler;
	}
	
	/**
	 * Prune a node, and recursively prune every node
	 * under it as well
	 * @return the total number of nodes pruned as a result
	 */
	prune() {
		if (this.isPruned)
			return 0;
		let result = 0;
		if (this.next)
			result += this.next.prune();
		if (this.child)
			result += this.child.prune();
		this.isPruned = true;
		return result + 1;
	}

	/**
	 * Depth-first tree walk.
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
	 * Search along this child next chain for a node with the 
	 * letter "thisLetter". Note that the next chains are ordered
	 * by letter.
	 * @param thisLetter char
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
	 * @param thisLetter char
	 * @param wordEnder true to end a word
	 * @param startDepth
	 */
	insertChild(thisLetter, wordEnder, startDepth) {
		if (!this.child) {
			// Case 1:  child list does not exist yet, so start it.
			this.child = new Tnode(
				thisLetter, null, wordEnder,
				this.level + 1, startDepth, this, true);
		}
		else if (this.child.letter > thisLetter) {
			// Case 2: thisLetter should be the first in the child list
			// that already exists.
			let holder = this.child;
			holder.isFirstChild = false;
			this.child = new Tnode(
				thisLetter, holder, wordEnder,
				this.level + 1, startDepth, this, true);
			holder.parent = this.child;
		}
		else {
			// Case 3: The child list exists and thisLetter is not first
			// in the list.
			let currently = this.child;
			while (currently.next) {
				if (currently.next.letter > thisLetter)
					break;
				currently = currently.next;
			}
			let holder = currently.next;
			currently.next = new Tnode(
				thisLetter, holder, wordEnder,
				this.level + 1, startDepth, currently, false);
			if (holder)
				holder.parent = currently.next;
		}
		this.numberOfChildren++;
	}

	/**
	 * Determine if this and "other" are the parent nodes
	 * of equal tree branches.  This includes identical nodes in the
	 * current list. The "maxChildDepth" of the two nodes can not be
	 * assumed equal due to the recursive nature of this function, so
	 * we must check for equivalence.
	 */
	sameSubtree(other) {
		if (other === this)
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
	
		if (this.child != null && !this.child.sameSubtree(other.child))
			return false;

		if (this.next != null && !this.next.sameSubtree(other.next))
			return false;
		
		return true;
	}

	/**
	 * This is a standard depth-first preorder tree traversal, whereby
	 * the objective is to count nodes of various "maxChildDepth"s.
	 * The counting results are placed into the "tabulator" array.
	 * This will be used to streamline the "Trie"-to-"Dawg" conversion
	 * process.
	 */
	graphTabulateRecurse(level, tabulator) {
		if (level === 0)
			this.child.graphTabulateRecurse(level + 1, tabulator);
		else if (!this.isPruned) {
			tabulator[this.maxChildDepth]++;
			
			// Go Down if possible.
			if (this.child)
				this.child.graphTabulateRecurse(level + 1, tabulator);
			
			// Go Right through the Para-List if possible.
			if (this.next)
				this.next.graphTabulateRecurse(level, tabulator);
		}
	}

	/**
	 * Returns the first node in the red[maxChildDepth], that is
	 * identical to "this". If the function returns 'this'
	 * then it is the first of its kind in the
	 * Trie.
	 */
	mexicanEquivalent(red) {
		//return red[this.maxChildDepth].find(n => this.sameSubtree(n));
		let x;
		for (x = 0; x < red[this.maxChildDepth].length; x++)
			if (this.sameSubtree(red[this.maxChildDepth][x]))
				break;
		if (red[this.maxChildDepth][x].isPruned)
			throw Error("Mexican equivalent is pruned!");
		return red[this.maxChildDepth][x];
	}

	/**
	 * Recursively replaces all redundant nodes in a trie with their
	 * first equivalent.
	 */
	replaceRedundantNodes(red) {
		if (this.level === 0 )
			return this.child.replaceRedundantNodes(red);

		// When replacing a "Tnode", we must do so knowing that
		// "this" is how we got to it.
		if (!this.next && !this.child)
			return 0;

		let trimmed = 0;
		if (this.child) {
			if (this.child.isPruned) {
				// we have found a node that has been tagged for
				// as pruned, so let us replace it with its first
				// equivalent which isn't tagged.
				this.child = this.child.mexicanEquivalent(red);
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
				console.log("WARNING input not in alphabetical order");
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
					if (!nodesAtDepth[x].isPruned && nodesAtDepth[x].isFirstChild) {
						if (nodesAtDepth[w].sameSubtree(nodesAtDepth[x])) {
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
		// first mexican equivalent in the Trie to make a compressed Dawg.
		let trimmed = this.first.replaceRedundantNodes(red);
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

const DESCRIPTION = "USAGE\n  node DAWG_Compressor.js [options] <lexicon> <outfile>\n"
+ "Create a directed acyclic word graph (DAWG) from a list of words. <lexicon> is a text\n"
+ "file containing a list of words, and <outfile> is the binary file containing the\n"
+ "DAWG, as used by the Dictionary.js module."


const OPTIONS = [
    ["l", "length=ARG", "Maximum length over which to ignore words. 15 is usual for Scrabble."]
];

requirejs.config({
	paths: {
		game: "js/game"
	}
});

requirejs(["node-getopt", "fs-extra", 'node-gzip', 'game/Dictionary'], (Getopt, Fs, Gzip, Dictionary) => {
	let opt = new Getopt(OPTIONS)
		.bindHelp()
		.setHelp(DESCRIPTION + "\nOPTIONS\n[[OPTIONS]]")
		.parseSystem();
	
	if (opt.argv.length < 2) {
		opt.showHelp();
		throw "Both <infile> and <outfile> are required";
	}

	let lenCheck = opt.length || 15;
	let infile = opt.argv[0];
	let outfile = opt.argv[1];

	Fs.readFile(infile)
	.then(async function(data) {
		let lexicon = data.toString().toUpperCase().split(/\r?\n/);

		// Create an array of arrays, indexed on word length
		let words = [];
		
		for (let word of lexicon) {
			let len = word.length;		
			if (len > 0 && len <= lenCheck)
				words.push(word);
			else
				console.log(`Ignored '${word}'`);
		}

		// First step; generate a Trie from the words in the lexicon
		let trie = new Trie(words.sort());

		// Second step; generate a graph from the tree
		let red = trie.generateDAWG();
		
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

		z = await Gzip.gzip(dv);
		console.log(`Compressed ${z.length} bytes`);

		// Debug
		//let ub = await Gzip.ungzip(z);
		//console.log(`Uncompressed ${ub.length}`);
		//let dict = new Dictionary(ub.buffer);
		//dict.walk(w => console.log(w));

		// Write DAWG binary bytes
		return Fs.writeFile(outfile, z)
		.then(() => console.log(`Wrote DAWG to ${outfile}`));
	});
});
