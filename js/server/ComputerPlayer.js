define("server/ComputerPlayer", ["server/Player", "game/BestMove"], (Player, findBestMove) => {

	class ComputerPlayer extends Player {
		
		constructor(name, key) {
			super(name, key);
		}

		copy() {
			return new ComputerPlayer(this.name, this.key);
		}

		toString() {
			return `Computer${super.toString()}`;
		}

		/**
		 * Send an email invitation to a player
		 */
		async sendInvitation(/*subject, config*/) {
		}

		play(game) {
			let player = this;
			console.log(`${this.name}'s turn`);
			return findBestMove(game, this)
			.then(move => {
				let letters = move.word.split("");
				let col = move.start[0];
				let row = move.start[1];
				let placements = [];
				for (let letter of letters) {
					if (!game.board.squares[col][row].tile)
						placements.push({
							letter: letter,
							col: col,
							row: row,
							blank: false
						});
						
					if (move.axis === 'v')
						row++;
					else
						col++;
				}
				if (placements.length == 0) {
					console.log(`${this.name} can't move, passing`);
					return game.pass(player, 'pass');
				} else {
					console.log(`${this.name} best move ${move.word} @`, move.start);
					return game.makeMove(player, placements);
				}
			});
		}
	}

	return ComputerPlayer;
});
