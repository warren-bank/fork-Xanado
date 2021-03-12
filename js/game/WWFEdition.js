define("game/WWFEdition", ["game/Edition"], (Edition) => {
	const WWF_BOARD = [ // WWF
		'___T__t_t__T___',
		'__d__D___D__d__',
		'_d__d_____d__d_',
		'T__t___D___t__T',
		'__d___d_d___d__',
		'_D___t___t___D_',
		't___d_____d___t',
		'___D_______D___',
		't___d_____d___t',
		'_D___t___t___D_',
		'__d___d_d___d__',
		'T__t___D___t__T',
		'_d__d_____d__d_',
		'__d__D___D__d__',
		'___T__t_t__T___'
	];

	class WWFEdition extends Edition {
		constructor(bag) {
			super(WWF_BOARD, bag);
			this.allPlacedBonus = 35;
		}
	}

	return WWFEdition;
});
