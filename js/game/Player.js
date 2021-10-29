/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, jquery */

define('game/Player', ['platform', 'game/GenKey', 'game/Rack'], (Platform, GenKey, Rack) => {

	// Unicode characters
	const BLACK_CIRCLE = '\u25cf';

	/**
	 * A player in a {@link Game}. Player objects are specific to
	 * a single game, and are used on both browser and server sides.
	 */
	class Player {

		/**
		 * @param {(string|Player)} name name of the player, or
		 * a Player object to copy
		 * @param {boolean} isRobot if name is a string and true then
		 * it's a robot. If name is a Player object, ignored.
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

			/**
			 * Player name
			 * @member {string}
			 */
			this.name = name;

			/**
			 * Index of the player in the game, assigned when they
			 * join a game
			 * @member {number}
			 */
			this.index = -1;

			/**
			 * Player doesn't have a rack until they join a game, as
			 * it's only then we know how big it has to be.
			 * @member {Rack}
			 */
			this.rack = null;

			/**
			 * Number of times this player has passed (or swapped)
			 * @member {number}
			 */
			this.passes = 0;

			/**
			 * Set true to advise player of better plays than the one
			 * they used
			 * @member {boolean}
			 */
			this.wantsAdvice = false;

			/**
			 * Player's current score
			 * @member {number}
			 */
			this.score = 0;
		}

		/**
		 * Create simple structure describing a subset of the player
		 * state, for sending to the 'games' interface
		 * @param {Game} game the game the player is participating in
		 * @return a simple structure describing the player
		 */
		catalogue(game) {
			return {
				name: this.name,
				isRobot: this.isRobot,
				connected: this.isRobot || (game.getConnection(this) !== null),
				key: this.key,
				score: this.score,
				email: this.email ? true : false
			};
		}

		/**
		 * Join a game by drawing an initial rack from the letter bag.
		 * @param {LetterBag} letterBag LetterBag to draw tiles from
		 * @param {number} rackSize size of racks in this game
		 * @param {number} index 'Player N'
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
		 * @param {number} time number of ms before elapse, or 0 for no timeout
		 * @param {function} timedOut a function() invoked if the timer expires
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
		 * Toggle wantsAdvice on/off
		 */
		toggleAdvice() {
			this.wantsAdvice = !this.wantsAdvice;
		}

		/**
		 * Promise to send an email invitation to a player on
		 * the server side only.
		 * @param {string} subject the subject of the mail
		 * @param {string} gameURL the URL of the game
		 * @param {object} config the global config object
		 * @return {Promise} Promise that resolves to the player's name
		 */
		emailInvitation(subject, gameURL, config) {
			if (!config.mail || !config.mail.transport)
				return Promise.reject('Mail is not configured');

			const url = `${gameURL}/${this.key}`;
			console.log(`Sending email invitation to ${this.name} subject ${subject} url ${url}`);

			return config.mail.transport.sendMail(
				{
					from: config.mail.sender,
					to:  this.email,
					subject: subject,
					text: Platform.i18n('email-join-text', url),
					html: Platform.i18n('email-join-html', url)
				})
			.then(() => this.name);
		}

		/**
		 * Create score table representation of the player on the browser
		 * side only.
		 * @param {Player} thisPlayer the player for whom the DOM is
		 * being generated
		 * @return {jQuery} DOM object for the score table
		 */
		createScoreDOM(thisPlayer) {
			const $tr = $(`<tr id='player${this.index}'></tr>`);
			$tr.append(`<td class='myTurn'>&#10148;</td>`);
			const who = thisPlayer && thisPlayer.key === this.key
				? Platform.i18n('You')
				: this.name;
			$tr.append(`<td class='playerName'>${who}</td>`);
			$tr.append('<td class="remainingTiles"></td>');
			/**
			 * Jquery object that contains this player's online status on
			 * the browser side only.
			 * @private
			 * @member {jQuery}
			 */
			this.$status = $(`<td class='status offline'>${BLACK_CIRCLE}</td>`);
			$tr.append(this.$status);
			/**
			 * Jquery object that contains this player's score on
			 * the browser side only.
			 * @private
			 * @member {jQuery}
			 */
			this.$score = $(`<td class='score'>${this.score}</td>`);
			$tr.append(this.$score);
			return $tr;
		}

		/**
		 * Refresh score table representation of the player on the browser
		 * side only.
		 */
		refreshDOM() {
			this.$score.text(this.score);
		}

		/**
		 * Set 'online' status of player in UI on the browser
		 * side only.
		 * @param {boolean} tf true/false
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
