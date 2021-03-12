define("game/ScrabbleEdition", ["game/Edition"], (Edition) => {
	const BOARD = [
		"D___d__T",
		"_d___d__",
		"__t___t_",
		"___D____",
		"d___D__d",
		"_d___D__",
		"__t___D_",
		"T___d__T",
	];

	class ScrabbleEdition extends Edition {
		constructor(bag) {
			super(BOARD, bag);
			this.allPlacedBonus = 50;
		}
	}

	return ScrabbleEdition;
});
