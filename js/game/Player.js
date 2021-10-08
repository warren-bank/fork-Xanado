/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, jquery */

define('game/Player', ["platform/Platform", 'game/GenKey', 'game/Rack'], (Platform, GenKey, Rack) => {

	// Unicode characters
	const BLACK_CIRCLE = '\u25cf';

	class Player {

		/**
		 * @param name String name of the player, or a Player object to copy
		 * @param isRobot if name is a string and true then it's a robot. If
		 * name is a Player object, ignored.
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
			//console.log('Created',this);
		}

		/**
		 * Create simple structure describing the player, for use in the
		 * games interface
		 */
		catalogue(game) {
			return {
				name: this.name,
				isRobot: this.isRobot,
				connected: this.isRobot || (game.getConnection(this) !== null),
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

		/**
		 * Set a play timeout for the player if they haven't player before
		 * time has elapsed
		 * @param time number of ms before elapse, or 0 for no timeout
		 * @param timedOut a function invoked if the timer expires
		 */
		startTimer(time, timedOut) {
			this.stopTimer();

			if (time === 0)
				// No timeout, nothing to do
				return;

			this.timeoutAt = Date.now() + time;
			console.log(`${this.name}'s go will time out in ${time/1000}s at ${new Date(this.timeoutAt)}`);

			// Set an overriding timeout
			this._timeoutTimer = setTimeout(() => {
				this._timeoutTimer = null;
				console.log(`${this.name} has timed out at ${Date.now()}`);
				// Invoke the timeout function
				timedOut();
			}, time);
		}

		/**
		 * Cancel current timeout
		 */
		stopTimer() {
			if (this._timeoutTimer) {
				clearTimeout(this._timeoutTimer);
				this._timeoutTimer = null;
			}
		}

		/**
		 * Generate a simple string representation of the player
		 */
		toString() {
			let s = `Player${this.index} '${this.name}'`;
			if (this.isRobot)
				s += ' (Robot)';
			if (this.key)
				s += ` key ${this.key}`;
			return s;
		}

		/**
		 * Send an email invitation to a player
		 * Only useful server-side
		 */
		async sendInvitation(subject, config) {
			console.log(`Sending email invitation to ${this.name} subject ${subject}`);
			try {
				const url = `${config.baseUrl}game/${this.key}`;
				console.log('link: ', url);

				const mailResult = await config.smtp.sendMail(
					{ from: config.mailSender,
					  to:  this.email,
					  subject: subject,
					  text: `Join the game by following this link: ${url}`,
					  html: `Click <a href='${url}'>here</a> to join the game.`
					});
				console.log('mail sent', mailResult.response);
			}
			catch (e) {
				console.log('cannot send mail:', e);
			}
		}

		/**
		 * Create score table representation of the player
		 * Only useful browser-side
		 */
		createScoreDOM(thisPlayer) {
			const $tr = $(`<tr id='player${this.index}'></tr>`);
			$tr.append(`<td class='myTurn'>&#10148;</td>`);
			const who = thisPlayer && thisPlayer.key === this.key
				? Platform.i18n('You')
				: this.name;
			$tr.append(`<td class='playerName'>${who}</td>`);
			$tr.append('<td class="remainingTiles"></td>');
			this.$status = $(`<td class='status offline'>${BLACK_CIRCLE}</td>`);
			$tr.append(this.$status);
			this.$score = $(`<td class='score'>${this.score}</td>`);
			$tr.append(this.$score);
			return $tr;
		}

		/**
		 * Refresh score table representation of the player
		 * Only useful browser-side
		 */
		refreshDOM() {
			this.$score.text(this.score);
		}

		/**
		 * Set 'online' status of player in UI
		 * Only useful browser-side
		 */
		online(tf) {
			if (tf)
				this.$status.removeClass('offline').addClass('online');
			else
				this.$status.removeClass('online').addClass('offline');
		}
	}

	return Player;
});
