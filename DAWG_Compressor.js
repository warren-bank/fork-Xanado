/**
 * Based on Daniel Weck's DAWG_Compressor.c
 */
const requirejs = require('requirejs');

const LETTER_BIT_SHIFT = 25;
const LETTER_BIT_MASK      = 0x000001F;
const CHILD_INDEX_BIT_MASK = 0x1FFFFFF;
const END_OF_WORD_BIT_MASK = 0x80000000;
const END_OF_LIST_BIT_MASK = 0x40000000;

const MAX_ENCODABLE_ALPHABET = (~(END_OF_WORD_BIT_MASK|END_OF_LIST_BIT_MASK) >> LETTER_BIT_SHIFT) + 1;
const MAX_ENCODABLE_INDEX = (1 << LETTER_BIT_SHIFT) - 1;

class Tnode {
	
	constructor(letter, next, isWordEnding, level, starterDepth, parent, isAChild) {
		this.letter = letter;
		this.index = 0;
		this.numberOfChildren = 0;
		this.maxChildDepth = starterDepth;
		this.next = next;
		this.child = null;
		this.parent = parent;
		this.isDangling = false;
		this.isEndOfWord = isWordEnding;
		this.level = level;
		this.isDirectChild = isAChild;
	}

	toString() {
		return `${this.letter} ${this.maxChildDepth}`;
	}
	
	/**
	 * Make a simpler version of the node for serialisation
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
	 * Dangle a node, but also recursively dangle every node
	 * under it as well, that way nodes that are not direct
	 * children do hit the chopping block.
	 * @return the total number of nodes dangled as a result
	 */
	dangle() {
		if (this.isDangling)
			return 0;
		let result = 0;
		if (this.next)
			result += this.next.dangle();
		if (this.child)
			result += this.child.dangle();
		this.isDangling = true;
		return result + 1;
	}

	clearVisit() {
		if (this.visited) {
			this.visited = false;

			if (this.child)
				this.child.clearVisit();
			
			if (this.next)
				this.next.clearVisit();
		}
	}
	
	/**
	 * Depth-first tree walk.
	 * @param s string generated to date
	 * @param cb callback function, takes generated string and node
	 */
	walk(s, cb) {

		let currentString = `${s}${this.letter}`;

		if (this.index > 0)
			currentString += `(${this.index})`;
		if (this.isEndOfWord)
			currentString += `.`;
			
		if (this.isEndOfWord)
			cb(currentString, this);
			
		if (this.child)
			this.child.walk(currentString, cb);
			
		if (this.next)
			this.next.walk(s, cb);
	}
	
	/**
	 * Find the Tnode in a parallel list of nodes with the 
	 * letter "thisLetter", and return null if the Tnode 
	 * does not exist.
	 * In the null case, an insertion will be required.
	 */
	findParaNode(thisLetter) {
		if (this.letter == thisLetter)
			return this;
		let result = this;
		while (result.letter < thisLetter) {
			result = result.next;
			if (!result)
				return null;
		}
		return (result.letter == thisLetter) ? result : null;
	}

	insertParaNode(thisLetter, wordEnder, startDepth) {
		this.numberOfChildren++;
		if (!this.child) {
			// Case 1:  Para-List does not exist yet, so start it.
			this.child = new Tnode(
				thisLetter, null, wordEnder,
				this.level + 1, startDepth, this, true);
		}
		else if (this.child.letter > thisLetter) {
			// Case 2: thisLetter should be the first in the child list
			// that already exists.
			let holder = this.child;
			holder.isDirectChild = false;
			this.child = new Tnode(
				thisLetter, holder, wordEnder,
				this.level + 1, startDepth, this, true);
			holder.parent = this.child;
		}
		else {
			// Case 3: The paraList exists and thisLetter is not first
			// in the list.  This is the default case condition: "if (
			// this.child.letter < thisLetter )"
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
	}

	/**
	 * Determine if this and "other" are the parent nodes
	 * of equal tree branches.  This includes identical nodes in the
	 * current list. The "maxChildDepth" of the two nodes can not be
	 * assumed equal due to the recursive nature of this function, so
	 * we must check for equivalence.
	 */
	areWeTheSame(other) {
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
	
		if (this.child != null && !this.child.areWeTheSame(other.child))
			return false;

		if (this.next != null && !this.next.areWeTheSame(other.next))
			return false;
		
		return true;
	}

	// This function simply makes "TrieAddWord" look a lot smaller.
	// It returns the number of new nodes that it just inserted.
	addWord(word) {
		let current = this;
		let nNew = 0;
		for (let x = 0; x < word.length; x++) {
			let hangPoint = current.child ?
				current.child.findParaNode(word[x]) : null;
			
			if (!hangPoint) {
				current.insertParaNode(
					word[x], x == word.length - 1, word.length - x - 1);
				nNew++;
				current = current.child.findParaNode(word[x]);
				for (let y = x + 1; y < word.length; y++) {
					current.insertParaNode(
						word[y], y == word.length - 1, word.length - y - 1);
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
			if (x == word.length - 1) {
				console.log("WARNING input not in alphabetical order");
				current.isEndOfWord = true;
			}
		}
		return nNew;
	}

	/**
	 * This is a standard depth-first preorder tree traversal, whereby
	 * the objective is to count nodes of various "maxChildDepth"s.
	 * The counting results are placed into the "tabulator" array.
	 * This will be used to streamline the "Trie"-to-"Dawg" conversion
	 * process.
	 */
	graphTabulateRecurse(level, tabulator) {
		if (level == 0)
			this.child.graphTabulateRecurse(level + 1, tabulator);
		else if (!this.isDangling) {
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
		//return red[this.maxChildDepth].find(n => this.areWeTheSame(n));
		let x;
		for (x = 0; x < red[this.maxChildDepth].length; x++)
			if (this.areWeTheSame(red[this.maxChildDepth][x]))
				break;
		if (red[this.maxChildDepth][x].isDangling)
			throw Error("Mexican equivalent is dangling");
		return red[this.maxChildDepth][x];
	}

	/**
	 * Recursively replaces all redundant nodes in a trie with their
	 * first equivalent.
	 */
	replaceRedundantNodes(red) {
		if (this.level == 0 )
			return this.child.replaceRedundantNodes(red);

		// When replacing a "Tnode", we must do so knowing that
		// "this" is how we got to it.
		if (!this.next && !this.child)
			return 0;

		let trimmed = 0;
		if (this.child) {
			if (this.child.isDangling) {
				// we have found a node that has been tagged for
				// as dangling, so let us replace it with its first
				// equivalent which isn't tagged.
				this.child = this.child.mexicanEquivalent(red);
				if (this.child == null)
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
	 * Encode the node in an integer. Required node indices to have
	 * been established.
	 */
	encoded(index, alphabet) {
		let offset = alphabet.indexOf(this.letter);
		let numb = offset << LETTER_BIT_SHIFT;
		if (this.child)
			numb = numb | this.child.index;
		if (this.isEndOfWord)
			numb = numb | END_OF_WORD_BIT_MASK;
		if (!this.next)
			numb = numb | END_OF_LIST_BIT_MASK;
		console.log(`${index} ${this.letter} ${offset}${this.isEndOfWord?" EOW":""}${this.next?"":" EOL"}`);
		return numb;
	}
}

class Trie {

	/**
	 * Construct a Trie from a word list
	 */
	constructor(lexicon) {
		console.log("\nConstruct Trie and fill from lexicon");

		this.numberOfTotalWords = 0;
		this.numberOfTotalNodes = 0;
		this.first = new Tnode('0', null, false, 0, 0, null, false);
		this.maxWordLen = 0;
		
		let x;
		let alphabet = [];
		for (x in lexicon) {
			let words = lexicon[x];
			for (let word of words) {
				let len = word.length;
				if (len > this.maxWordLen)
					this.maxWordLen = len;
				if (len < this.minWordLen)
					this.minWordLen = len;
				this.addWord(word);
				for (let char of word)
					alphabet[char] = true;
			}
		}
		this.alphabet = Object.keys(alphabet).sort().join("");
		console.log(`Alphabet '${this.alphabet}'`);
		
		let nodeNumberCounter = [];
		for (x = 0; x < this.maxWordLen; x++)
			nodeNumberCounter.push(0);

		// Count the total number of nodes in the raw Trie by maxChildDepth
		if (this.numberOfTotalWords > 0)
			this.first.graphTabulateRecurse(0, nodeNumberCounter);
	
		let totalNodeSum = 0;
		for (x = 0; x < this.maxWordLen; x++) {
			let n = nodeNumberCounter[x];
			totalNodeSum += n;
			console.log(`Initial node count For depth |${x}| is ${n}`);
		}

		console.log(`There are ${totalNodeSum} nodes in the Trie`);
	}

	rootNode() {
		return (this.numberOfTotalWords > 0) ? this.first : null;
	}

	addWord(word) {
		this.numberOfTotalWords++;
		this.numberOfTotalNodes += this.first.addWord(word);
	}

	/**
	 * Construct an array indexed on maxChildDepth (word length)
	 * Each entry is an array that contains all the nodes with that
	 * maxChildDepth. Note that the algorithm operates breadth-first
	 * to ensure the ordering in the individual rows follows the
	 * 'next' pointers. It should work depth-first as well, but we
	 * know this way works.
	 * @return the structure
	 */
	createReductionStructure() {
		console.log("\nCreate reduction structure");

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
			added++;
			current = current.child;
			while (current) {
				queue.push(current);
				current = current.next;
			}
		}
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
	findDanglingNodes(red) {
		console.log("\nMark redundant nodes as dangled");
		
		// Use recursion because only direct children are considered for
		// elimination to keep the remaining lists intact. Start at
		// the largest "maxChildDepth" and work down from there for
		// recursive reduction to take place early on to reduce the work
		// load for the shallow nodes.
		let totalDangled = 0;
		for (let y = red.length - 1; y >= 0 ; y--) {
			let numberDangled = 0;
			// Move through the red array from the beginning, looking
			// for any nodes that have not been dangled, these will be the
			// surviving nodes.
			// Could equally use for (w in readArray[y])
			// but this is a useful check
			let nodesAtDepth = red[y];
			for (let w = 0; w < nodesAtDepth.length - 1; w++) {
				if (nodesAtDepth[w].isDangling)
					// The Node is already Dangling.  Note that this node need
					// not be the first in a child list, it could have been
					// dangled recursively.  In order to eliminate the need
					// for the "next" index, the nodes at the root of
					// elimination must be the first in a list, in other
					// words, "isDirectChild". The node that we replace the
					// "isDirectChild" node with can be located at any position.
					continue;

				// Traverse the rest of the list looking for equivalent
				// nodes that are both not dangled and are tagged as
				// direct children.  When we have found an identical list
				// structure further on in the array, dangle it, and all
				// the nodes coming after, and below it.
				for (let x = w + 1; x < nodesAtDepth.length; x++) {
					if (!nodesAtDepth[x].isDangling
						&& nodesAtDepth[x].isDirectChild) {
						if (nodesAtDepth[w].areWeTheSame(nodesAtDepth[x])) {
							numberDangled += nodesAtDepth[x].dangle();
						}
					}
				}
			}
			console.log(`Dangled |${numberDangled}| nodes at depth |${y}|`);
			totalDangled += numberDangled;
		}
		
		console.log(`Dangled a total of ${totalDangled} nodes`);
	}
	
	/**
	 * Label all of the remaining nodes in the Trie-Turned-Dawg so that
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

		// Assign an index to
		// the node, if one has not been given to it yet. Nodes will
		// be placed on the queue many times.
		// Note that indices are 1-based!
		let indexNow = 1;
		while (queue.length > 0) {
			current = queue.shift();
			// If the node already has a non-zero index, don't give it a new one.
			// if it has an index, all it's next and child nodes should too.
			if (current.index === 0) {
				current.index = indexNow++;
				nodeList.push(current);
				current = current.child;
				while (current) {
					queue.push(current);
					current = current.next;
				}
			}
		}

		console.log(`Assigned ${indexNow - 1} node indexes`);
		
		return nodeList;
	}

	/**
	 * Go through the steps to 
	 */
	generateDAWG() {

		// When populating the "red", we are going to do so
		// in a breadth first manner to ensure that the next "Tnode" in a
		// list is located at the next array index.
		let red = this.createReductionStructure();

		this.findDanglingNodes(red);

		// Dangling is complete, so replace all dangled nodes with their
		// first mexican equivalent in the Trie to make a compressed Dawg.
		let trimmed = this.first.replaceRedundantNodes(red);
		console.log(`Trimmed ${trimmed} dangling nodes`);

		return red;
	}

	/**
	 * Convert a DAWG expressed as a network of Trie nodes into a
	 * linear 32-bit integer array. Each number in this array is an
	 * encoded, indexed node. The first node is at position 1 in the
	 * file (for historical reasons).
	 * The top bit of a number is set when this node is a valid word end.
     * The next bit is set when the node is the end of a "next" list.
     * The next 6 bits encode the letter stored at that node. The
	 * letter is stored as an index into the alphabet, so the maximum
	 * alphabet storable this way is (1<<5)-1 = 31 characters. The
	 * remaining 25 bits store the index of the child node, thus
	 * allowing a maximum of (1<<25)-1 = 33554431 nodes.
	 * The next node is always at index + 1.
	 *
	 * 31 characters may be fine for English, but other alphabets will
	 * have more characters.
	 * @return array of integers
	 */
	encodeDAWG() {
		console.log("\nGenerate the unsigned integer array");

		if (this.alphabet.length > MAX_ENCODABLE_ALPHABET)
			throw Error(`alphabet ${this.alphabet} is too large to integer-encode`);
		
		let dawg = this.assignIndices();
		
		// Debug
		console.log("\nValidate lexicon with indices");
		this.first.child.walk('', w => console.log(w));

		if (dawg.length > MAX_ENCODABLE_INDEX)
			throw Error(`Too many nodes remain for integer encoding`);

		// Replace nodes in the node list with their encoded equivalent
		for (let i = 0; i < dawg.length; i++) {
			dawg[i] = dawg[i].encoded(i + 1, this.alphabet);
		}
		dawg.unshift(dawg.length);
		
		console.log(`${dawg.length} integer array generated`);
		
		return dawg;
	}
}

function DAWG_walk(dawg, index, s, cb, alphabet) {
	const letter = (dawg[index] >> LETTER_BIT_SHIFT) & LETTER_BIT_MASK;
	let ch = alphabet.charAt(letter)
	
	if ((dawg[index] & END_OF_WORD_BIT_MASK) != 0) {
		cb(s + ch);
	}
			
	const childIndex = (dawg[index] & CHILD_INDEX_BIT_MASK);

	//console.log(`@${index} ${s} '${ch}' ${childIndex}`);
	
	if (childIndex > 0)
		DAWG_walk(dawg, childIndex, s + ch, cb, alphabet);
			
	if ((dawg[index] & END_OF_LIST_BIT_MASK) == 0)
		DAWG_walk(dawg, index + 1, s, cb, alphabet);
}

function DAWG_decode(numb, i, alphabet) {
	let offset = ((numb >> LETTER_BIT_SHIFT) & LETTER_BIT_MASK);
	let letter = alphabet.charAt(offset);
	let childIndex = (numb & CHILD_INDEX_BIT_MASK);
	let isEndOfWord =  ((numb & END_OF_WORD_BIT_MASK) != 0);
	let isEndOfList = ((numb & END_OF_LIST_BIT_MASK) != 0);
	return `${i} ${letter} ${offset}${isEndOfWord?" EOW":""}${isEndOfList?" EOL":""}`;
}

function DictDecode(dict, i, alphabet) {
	let offset = dict.DAWG_Letter(i);
	let letter = alphabet.charAt(offset);
	let childIndex = dict.DAWG_ChildIndex(i);
	let isEndOfWord =  dict.DAWG_IsEndOfWord(i);
	let nextIndex = dict.DAWG_NextIndex(i);
	return `${i} ${letter} ${offset}${isEndOfWord?" EOW":""}${nextIndex==0?" EOL":""}`;
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

requirejs(["node-getopt", "fs-extra", 'game/Dictionary'], (Getopt, Fs, Dictionary) => {
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
	.then(data => {
		let lexicon = data.toString().toUpperCase().split(/\r?\n/);

		// Create an array of arrays, indexed on word length
		let words = [];
		
		for (let word of lexicon) {
			let len = word.length;
			
			if (len > 0 && /^[^\d]+$/.test(word) && len <= lenCheck) {
				if (!words[len])
					words[len] = [ word ];
				else
					words[len].push(word);

			} else
				console.log(`Ignored '${word}'`);
		}

		// Sort the individual arrays by code point
		for (let i in words) {
			console.log(`There are ${words[i].length} words of length ${i}`);
			words[i].sort();
		}

		// First step; generate a Trie from the words in the lexicon
		let trie = new Trie(words);

		// Second step; generate a graph from the tree
		let red = trie.generateDAWG();
		
		// We have a DAWG. We could output it now like this:
		//console.log(JSON.stringify(trie.first.simplify(), null, " "));

		// Instead we want to generate an integer array for use with Dictionary
		//let dawg = trie.generateIntegerArray(red);
		let dawg = trie.encodeDAWG();

		// Decode the integer DAWG to make sure it corresponds with
		// what was encoded
		for (let i = 1; i < dawg.length; i++)
			console.log(DAWG_decode(dawg[i], i, trie.alphabet));

		// Walk the integer DAWG to compare with a node walk
		//DAWG_walk(dawg, 1, '', w => console.log(w), trie.alphabet);

		let buffer = new ArrayBuffer(dawg.length * 4);
		let dv = new DataView(buffer);
		for (let i = 0; i < dawg.length; i++)
			dv.setUint32(i * 4, dawg[i], true); // Little endian

		let bawg = new Uint8Array(buffer);
		console.log("BUFFER",bawg[0],bawg[1],bawg[2],bawg[3]);
		console.log("BUFFER",bawg[4],bawg[5],bawg[6],bawg[7]);
		let dict = new Dictionary(bawg);
		let sz = dict.readNumber(0);
		console.log("WTF", dict.DAWG_Number(0));
		for (let i = 1; i <= sz; i++) {
			console.log(DictDecode(dict, i, trie.alphabet));
		}

		dict.walk(w => console.log(w.map(l => trie.alphabet.charAt(l)).join("")));

		// Write DAWG binary bytes
		return Fs.writeFile(outfile, dv)
		.then(() => console.log(`Wrote DAWG to ${outfile}`));
	});
});
