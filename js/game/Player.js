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
		 * @param {boolean} key unique key identifying the player. Names
		 * may be duplicated, but keys never are.
		 * @param {boolean} isRobot if name is a string and true then
		 * it's a robot. If name is a Player object, ignored.
		 */
		constructor(name, key, isRobot) {
			if (name instanceof Player) {
				// Copying an existing player
				this.isRobot = name.isRobot;
				this.key = name.key; // re-use
				name = name.name;
			} else {
				this.key = key;
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

			/**
			 * Seconds remaining before play times out
			 * @member {number}
			 */
			this.timeRemaining = 0;
		}

		/**
		 * Create simple structure describing a subset of the player
		 * state, for sending to the 'games' interface
		 * @param {Game} game the game the player is participating in
		 * @param {UserManager} um user manager for getting emails
		 * @return {Promise} resolving to a simple structure describing the player
		 */
		catalogue(game, um) {
			return (this.isRobot ? Promise.resolve({}) : um.getUser({key: this.key}))
			.then(ump => {
				return {
					name: this.name,
					isRobot: this.isRobot,
					connected: this.isRobot || (game.getConnection(this) !== null),
					key: this.key,
					score: this.score,
					email: ump.email ? true : false,
					timeRemaining: this.timeRemaining
				};
			})
			.catch(e => {
				// User key not found in the db, for some reason. Not fatal.
				return {
					isRobot: this.isRobot,
					connected: this.isRobot || (game.getConnection(this) !== null),
					key: this.key,
					score: this.score,
					timeRemaining: this.timeRemaining
				};
			});
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
		 * Return all tiles to the letter bag
		 */
		returnTiles(letterBag) {
			for (let tile of this.rack.tiles())
				letterBag.returnTile(this.rack.removeTile(tile));
		}

		/**
		 * Set a play timeout for the player if they haven't player before
		 * time has elapsed
		 * @param {number} time number of seconds before elapse, or
		 * 0 for no timeout.
		 * If undefined, will restart a timer by stopTimer.
		 * @param {function} onTimeout a function() invoked if the
		 * timer expires
		 */
		startTimer(time, onTimeout) {
			if (typeof time !== 'undefined') {
				this.stopTimer();
				// Timer is being reset
				if (time === 0)
					// No timeout, nothing to do
					return;
				this._onTimeout = onTimeout;
			} else if (!this._timeoutTimer && this.timeRemaining > 0) {
				// Timer was stopped in stopTimer with time remaining
				time = this.timeRemaining;
			} else {
				this.stopTimer();
				return;
			}

			console.log(`${this.name}'s go will time out in ${time}s at ${new Date(Date.now() + time * 1000)}`);

			// Set an overriding timeout
			this.timeRemaining = time;
			this._timeoutAt = Date.now() + time * 1000;
			this._timeoutTimer = setTimeout(() => {
				this._timeoutTimer = null;
				console.log(`${this.name} has timed out at ${Date.now()}`);
				// Invoke the timeout function
				this._onTimeout();
			}, time * 1000);
		}

		/**
		 * Cancel current timeout
		 */
		stopTimer() {
			if (this._timeoutTimer) {
				this.timeRemaining = (this._timeoutAt - Date.now()) / 1000;
				console.log(`${this.name} stopped timer with ${this.timeRemaining}s remaining`);
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
		 * @param {UserManager} um user manager for getting emails
		 * @param {string} senderKey user key  for the sender, will default to
		 ( config.email.sender if undefined
		 * @return {Promise} Promise that resolves to the player's name
		 */
		emailInvitation(subject, gameURL, config, um, senderKey) {
			if (!config.mail || !config.mail.transport)
				return Promise.reject('Mail is not configured');
			const url = `${gameURL}/${this.key}`;
			return new Promise(
				resolve =>
				um.getUser({key: senderKey})
				.then(sender => resolve(`${sender.name}<${sender.email}>`))
				.catch(e => resolve(config.email.sender)))
			.then(sender => {
				return um.getUser({key: this.key})
				.then(ump => {
					if (!ump.email)
						return Promise.reject();

					console.log(`Sending invitation to ${this.name}<${ump.email}> subject ${subject} from ${sender} url ${url}`);
					return ump.email;
				})
				.then(email => config.mail.transport.sendMail({
					from: sender,
					to:  email,
					subject: subject,
					text: Platform.i18n('email-join-text', url),
					html: Platform.i18n('email-join-html', url)
				}))
				.then(() => this.name);
			});
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
