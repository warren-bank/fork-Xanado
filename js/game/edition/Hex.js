define("game/edition/Hex", ["game/Edition"], (Edition) => {

	const BOARD = [
		"_______",
		"_d_____",
		"__D____",
		"___t___",
		"____T__",
		"_____q_",
		"______Q",
	];

	const BAG = [
		{ score: 0, count: 1},
		
		{ letter: "0", score: 1, count: 1},
		{ letter: "1", score: 1, count: 1},
		{ letter: "2", score: 3, count: 2},
		{ letter: "3", score: 4, count: 3},
		{ letter: "4", score: 1, count: 4},
		{ letter: "5", score: 1, count: 5},
		{ letter: "6", score: 4, count: 6},
		{ letter: "7", score: 2, count: 7},
		{ letter: "8", score: 2, count: 8},
		{ letter: "9", score: 1, count: 9},
		{ letter: "A", score: 4, count: 10},
		{ letter: "B", score: 2, count: 11},
		{ letter: "C", score: 3, count: 12},
		{ letter: "D", score: 1, count: 13},
		{ letter: "E", score: 2, count: 14},
		{ letter: "F", score: 1, count: 15}
	];
	
	// Configure for a very short game (alphabet of only 16 letters)
	class Test_Test extends Edition {
		constructor() {
			super(BOARD, BAG);
		}
	}

	return Test_Test;
});
