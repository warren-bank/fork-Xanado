/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, jquery */

define("game/Player", ["game/GenKey", "game/Rack"], (GenKey, Rack) => {

	// Unicode characters
	const BLACK_CIRCLE = '\u25cf';

	class Player {

		/**
		 * @param name String name of the player, or a Player object to copy
		 * @param isRobot if name is a string and true then it's a robot. If
		 * name is a PLyer, ignored.
		 */
		constructor(name, isRobot) {
			if (name instanceof Player) {
				// Copying an existing player
				this.isRobot = name.isRobot;
				this.key = name.key; // re-use
				name = name.name;
			} else {
				this.key = GenKey();
				this.isRobot = isRobot;
			}
			this.name = name;
			this.score = 0;
			// Index of the player in the game, assigned when they
			// join a game
			this.index = -1;
			// Player doesn't have a rack until they join a game, as
			// it's only then we know how big it has to be.
			this.rack = null;
			// Number of times this player has passed (or swapped)
			this.passes = 0;
			// Set true to advise player of better plays than the one
			// they used
			this.wantsAdvice = false;
			//console.log("Created",this);
		}

		/**
		 * Create simple structure describing the player, for use in the
		 * games interface
		 */
		catalogue(game) {
			return {
				name: this.name,
				isRobot: this.isRobot,
				connected: game.isConnected(this),
				key: this.key
			};
		}

		/**
		 * Join a game by drawing an initial rack from the letter bag.
		 * @param letterBag LetterBag to draw tiles from
		 * @param rackSize size of racks in this game
		 * @param index 'Player N'
		 */
		joinGame(letterBag, rackSize, index) {
			// +1 to allow space for tile sorting in the UI
			this.rack = new Rack(rackSize + 1);
			for (let i = 0; i < rackSize; i++)
				this.rack.addTile(letterBag.getRandomTile());
			this.index = index;
			this.score = 0;
			console.log(`${this.name} is player ${this.index}`);
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

		createScoreDOM(thisPlayer) {
			const $tr = $(`<tr id='player${this.index}'></tr>`);
			$tr.append(`<td class='myTurn'>&#10148;</td>`);
			const who = thisPlayer.key === this.key
				? $.i18n('You')
				: this.name;
			$tr.append(`<td class='playerName'>${who}</td>`);
			$tr.append("<td class='remainingTiles'></td>");
			this.$status = $(`<td class='status offline'>${BLACK_CIRCLE}</td>`);
			$tr.append(this.$status);
			this.$score = $(`<td class='score'>${this.score}</td>`);
			$tr.append(this.$score);
			return $tr;
		}

		refreshDOM() {
			this.$score.text(this.score);
		}

		online(tf) {
			if (tf)
				this.$status.removeClass('offline').addClass('online');
			else
				this.$status.removeClass('online').addClass('offline');
		}
	}

	return Player;
});
