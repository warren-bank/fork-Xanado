define("server/Player", ["crypto", "game/Rack", "game/BestMove"], (Crypto, Rack, findBestMove) => {

	class Player {
		constructor(name, rackSize) {
			if (!rackSize)
				throw Error("Invalid rack size");
			this.key = Crypto.randomBytes(8).toString('hex');
			this.name = name;
			this.score = 0;
			this.index = -1;
			this.rackSize = rackSize;
			// +1 to allow space for tile swapping
			this.rack = new Rack(rackSize + 1);
			this.isRobot = false;
			//console.log("Created",this);
		}

		copy() {
			const p = new Player(this.name, this.rackSize);
			p.key = this.key;
			p.isRobot = this.isRobot;
			return p;
		}
		
		joinGame(game, index) {
			this.index = index;
			for (let i = 0; i < this.rackSize; i++) {
				this.rack.squares[i].tile = game.letterBag.getRandomTile();
			}
			console.log(`${this.name} is joining`);
			this.score = 0;
		}

		toString() {
			let s = "Player ";
			if (this.index >= 0)
				s += `${this.index} `;
			s += `${this.name} `;
			if (this.key)
				s += `key ${this.key} `;
			s += this.rack;
			return s;
		}

		/**
		 * Send an email invitation to a player
		 */
		async sendInvitation(subject, config) {
			if (!this.email)
				return;
			console.log(`sendInvitation to ${this.name} subject ${subject}`);
			try {
				const url = `${config.baseUrl}game/${this.key}`;
				console.log('link: ', url);

				const mailResult = await config.smtp.sendMail(
					{ from: config.mailSender,
					  to:  this.email,
					  subject: subject,
					  text: `Join the game by following this link: ${url}`,
					  html: `Click <a href="${url}">here</a> to join the game.`
					});
				console.log('mail sent', mailResult.response);
			}
			catch (e) {
				console.log('cannot send mail:', e);
			}
		}

		/**
		 * Robot play
		 */
		autoplay(game) {
			let player = this;

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
						
					row += move.drow;
					col += move.dcol;
				}
				if (placements.length == 0) {
					console.log(`${this.name} can't move, passing`);
					return game.pass(player, 'pass');
				} else {
					console.log(
						`${this.name} best move ${move.word} @`, move.start);
					return game.makeMove(player, placements);
				}
			});
		}
	}

	return Player;
});
