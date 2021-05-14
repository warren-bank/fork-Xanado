/*@preserve Copyright (C) 2021 Crawford Currie http://c-dot.co.uk license MIT*/
/* eslint-env node, mocha */

if (typeof module !== "undefined") {
    requirejs = require('requirejs');
    // node.js
}

requirejs.config({
    baseUrl: "..",
    paths: {
        "game": "js/game"
    }
});

requirejs(["test/TestRunner", "game/Fridge"], (TestRunner, Fridge) => {
	class Wibble {
		constructor(wib) {
			this._ignore = 666;
			this.wibble = wib;
		}

		toString() {
			return this.wibble;
		}
	}

    let tr = new TestRunner("Fridge");
    let assert = tr.assert;
	
    tr.addTest("simple", () => {

		let simple = {
			number: 10,
			string: "String",
			_ignore: "ignore", // will make assert.deepEqual fail
			date: new Date(1234567890123),
			array: [ 1, 2, 3 ],
			classObject: new Wibble("wibble"),
			object: { data: "lorem ipsum" }
		};
		let frozen = Fridge.freeze(simple);
		let thawed = Fridge.thaw(frozen, [ Wibble ]);
		assert.equal(thawed.number, simple.number);
		assert.equal(thawed.string, simple.string);
		assert.equal(thawed.date.toISOString(), simple.date.toISOString());
		assert.equal(thawed.array.toString(), simple.array.toString());
		assert.equal(JSON.stringify(thawed.object), JSON.stringify(simple.object));
		assert(thawed.classObject instanceof Wibble);
		assert.equal(thawed.classObject.toString(), simple.classObject.toString());
	});

    tr.addTest("instance-ref", () => {

		let frood = new Wibble("frood");
		let simple = {
			obj1: frood,
			obj2: frood,
			obj3: new Wibble("not frood")
		};
		let frozen = Fridge.freeze(simple);
		let thawed = Fridge.thaw(frozen, [ Wibble ]);
		assert(thawed.obj1 instanceof Wibble);
		assert(thawed.obj2 instanceof Wibble);
		assert.equal(thawed.obj1, thawed.obj2);
	});

    tr.addTest("array-ref", () => {

		let frood = [ 1, 2, 3, 4];
		let simple = {
			obj1: frood,
			obj2: frood
		};
		let frozen = Fridge.freeze(simple);
		//console.log(JSON.stringify(frozen));
		let thawed = Fridge.thaw(frozen, [ Wibble ]);
		//console.log(JSON.stringify(thawed));
		assert.equal(thawed.obj1, thawed.obj2);
	});

    tr.addTest("object-ref", () => {

		let frood = { 1: 2, 3: 4 };
		let simple = {
			obj1: frood,
			obj2: frood
		};
		let frozen = Fridge.freeze(simple);
		//console.log(JSON.stringify(frozen));
		let thawed = Fridge.thaw(frozen, [ Wibble ]);
		//console.log(JSON.stringify(thawed));
		assert.equal(thawed.obj1, thawed.obj2);
	});

    tr.addTest("self-referential", () => {

		let frood = new Wibble();
		frood.wibble = frood;
		let frozen = Fridge.freeze(frood);
		console.log(JSON.stringify(frozen));
		let thawed = Fridge.thaw(frozen, [ Wibble ]);
		//console.log(JSON.stringify(thawed));
		assert.equal(thawed.obj1, thawed.obj2);
	});

	tr.run();
});
