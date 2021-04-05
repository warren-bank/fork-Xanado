/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

define("game/Player", ["game/GenKey", "game/Rack", "game/Placement"], (GenKey, Rack, Placement) => {

	class Player {

		/**
		 * @param name String name of the player, or a Player object to copy
		 * @param rackSize number of tiles drawn (unused if name is a Player)
		 */
		constructor(name, rackSize) {
			if (name instanceof Player) {
				// Copying an existing player
				rackSize = name.rackSize;
				this.isRobot = name.isRobot;
				name = name.name;
			} else {
				this.key = GenKey();
				this.isRobot = false;
			}
			if (!rackSize)
				throw Error("Invalid rack size");
			this.name = name;
			this.score = 0;
			this.index = -1;
			this.rackSize = rackSize;
			// +1 to allow space for tile sorting in the UI
			this.rack = new Rack(rackSize + 1);
			//console.log("Created",this);
		}

		/**
		 * Join a game by drawing an initial rack from the letter bag.
		 * @param letterBag LetterBag to draw tiles from
		 * @param index 'Player N'
		 */
		joinGame(letterBag, index) {
			for (let i = 0; i < this.rackSize; i++)
				// May assign null if bag is empty
				this.rack.squares[i].tile = letterBag.getRandomTile();
			this.index = index;
			this.score = 0;
		}

		toString() {
			let s = `${this.isRobot ? "Robot" : "Human"} player `;
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
		 * Only useful server-side
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
			let bestPlay = null;
			
			console.log(`autoplay ${this.name}`);
			return new Promise((resolve, reject) => {
				requirejs(
					["game/findBestPlayController"],
//					["game/findBestPlay"],
					fn => resolve(fn));
			})
			.then(findBestPlay => findBestPlay(
				game, this.rack.letters(), data => {
					if (typeof data === "string")
						console.log(data);
					else {
						bestPlay = data;
						console.log("Best", bestPlay);
					}
				}))
			.then(() => {
				if (bestPlay) {
					let letters = bestPlay.word.split("");
					let col = bestPlay.start[0];
					let row = bestPlay.start[1];
					let placements = [];
					for (let letter of letters) {
						if (!game.board.squares[col][row].tile) {
							let sq = this.rack.findLetterSquare(letter, true);
							placements.push(new Placement(
								letter, col, row, sq.tile.isBlank));
						}
						
						row += bestPlay.drow;
						col += bestPlay.dcol;
					}
					console.log(
						`${this.name} best play ${bestPlay.word} @`,
						bestPlay.start);
					return game.makeMove(player, placements);
				} else {
					console.log(`${this.name} can't play, passing`);
					return game.pass(player, 'pass');
				}
			});
		}
	}

	return Player;
});
