define("server/Player", ["crypto", "game/Rack"], (Crypto, Rack) => {

	class Player {
		constructor(name, key) {
			this.key = key || Crypto.randomBytes(8).toString('hex');
			this.name = name;
			this.score = 0;
			this.index = -1;
			this.rack = new Rack(8);
		}

		copy() {
			return new Player(this.name, this.key);
		}
		
		joinGame(game, index) {
			this.index = index;
			for (let j = 0; j < 7; j++)
				this.rack.squares[j].tile = game.letterBag.getRandomTile();
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
	}

	return Player;
});
