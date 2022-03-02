/* eslint-env browser, jquery */

define('browser/Ui', [
	'socket.io', 'browser/Dialog',
	'game/Fridge',
	'game/Tile', 'game/Bag', 'game/Rack', 'game/Board', 'game/Game',
	'jquery', 'jqueryui', 'cookie', 'browser/icon_button'
], (
	Socket, Dialog,
	Fridge,
	Tile, Bag, Rack, Board, Game
) => {

	const SETTINGS_COOKIE = 'crossword_settings';

	/**
	 * Report an error returned from an ajax request.
	 * @param {string|array} args This will either be a
	 * simple i18n string ID, or an array containing an i18n ID and a
	 * series of arguments.
	 */
	function report(args) {
		let message;
		if (typeof(args) === 'string')
			message = $.i18n(args);
		else if (typeof args === 'object') {
			args[0] = $.i18n(args[0]);
			message = args.join(" ");
		}
		$('#alertDialog')
		.text(message)
		.dialog({ modal: true });
	}

	/**
	 * User interface to a game in a browser. The Ui reflects the game state as
	 * communicated from the server, through the exchange of various messages.
	 */
	class Ui {

		constructor() {

			console.log("Starting game UI");

			// Are we using https?
			this.usingHttps = document.URL.indexOf('https:') === 0;

			this.settings = {
				turn_alert: true,
				cheers: true,
				tile_click: true,
				warnings: true,
				notification: this.usingHttps
			};

			let m = document.URL.match(/[?;&]game=([^;&]+)/);
			if (!m) {
				const mess = `no game in ${document.URL}`;
				console.log(mess);
				throw new Error(mess);
			}
			const gameKey = m[1];

			/**
			 * Currently selected Square
			 * @member {Square}
			 */
			this.selectedSquare = null;

			/**
			 * Quick reference to typing cursor DOM object
			 * lateinit in loadGame
			 * @member {jQuery}
			 */
			this.$typingCursor = null;
			
			/**
			 * Typing is across if true, down if false
			 * @member {boolean}
			 */
			this.typeAcross = true;

			/**
			 * lateinit in loadGame
			 * @member {Player}
			 */
			this.player = null;

			/**
			 * Board lock status, private
			 * @member {boolean}
			 */
			this.boardLocked = false;

			this.attachHandlers();

			console.log(`GET /game/${gameKey}`);
			$.get(`/game/${gameKey}`)
			.then(frozen => {
				console.log(`Received game ${gameKey}`);
				const game = Fridge.thaw(frozen, Game.classes);
				return this.identifyPlayer(game)
				.then (playerKey => this.loadGame(game, playerKey))
				.then(() => this.attachSocketListeners())
				.catch(report);
			});
		}

		/**
		 * True if the current player is the player at the given index
		 */
		isPlayer(index) {
			return this.player && this.player.index === index;
		}

		/**
		 * Send a game command to the server. Game commands are
		 * 'swap', 'takeBack', 'pass', and 'pause'
		 * @param {string} command command name
		 * @param {object} args arguments for the request body
		 */
		sendCommand(command, args) {
			console.log(`Send ${command}`);
			this.cancelNotification();
			$.post(
				`/command/${command}/${this.game.key}/${this.player.key}`,
				// Pass data as a JSON string. If given an object,
				// jQuery will serialise it using $.param, which will
				// convert all numbers to strings. Which is a PITA.
				{ args: JSON.stringify(args) })
			.then(r => console.log(`${command} OK`, r))
			.catch(console.error);
		}

		/**
		 * Append to the log pane. Messages are wrapped in a div, which
		 * may have the optional css class.
		 * @param {(jQuery|string)} mess thing to add
		 * @param {string} optional css class name
		 * @return {jQuery} the div created
		 */
		log(mess, css) {
			const $div = $('<div></div>');
			if (css)
				$div.addClass(css);
			$div.append(mess);
			$('#logMessages').append($div);
			return $div;
		}

		/**
		 * Scroll to end of log.
		 * @param {number} speed animation duration in ms
		 */
		scrollLogToEnd(speed) {
			$('#logMessages').animate({
				scrollTop: $('#logMessages').prop('scrollHeight')
			}, speed);
		}

		/**
		 * Play an audio clip, identified by #id. Clips must be
		 * pre-loaded in the HTML. Note that most (all?) browsers require
		 * some sort of user interaction before they will play audio
		 * embedded in the page.
		 */
		playAudio(id) {
			const audio = document.getElementById(id);

			if (audio.playing)
				audio.pause();

			audio.defaultPlaybackRate = 1;
			audio.volume = 1;

			try {
				audio.currentTime = 0;
				audio.play();
			}
			catch(e) {
				const currentTime = () => {
					audio.currentTime = 0;
					audio.removeEventListener('canplay', currentTime, true);
					audio.play();
				};
				audio.addEventListener('canplay', currentTime, true);
			}
		}

		/**
		 * Append information on a turn to the log.
		 * @param {Turn} turn a Turn
		 * @param {boolean} latestTurn set true if this is the most recent turn
		 */
		appendTurnToLog(turn, latestTurn) {
			// Who's turn was it?
			const player = this.game.getPlayer(turn.player);
			this.log($.i18n('ui-log-turn-player', player.name), 'turnPlayer');

			// What did they do?
			const $turnDetail = $('<div></div>');
			switch (turn.type) {
			case 'move':
				{
					// Compose a description of the words created
					let ws = 0;
					let sum = 0;
					for (let word of turn.words) {
						$turnDetail
						.append(`<span class="word">${word.word}</span>`)
						.append(' (')
						.append(`<span class="wordScore">${word.score}</span>`)
						.append(') ');
						ws++;
						sum += word.score;
					}
					// deltaScore will always be a number after a move
					if (ws > 1 || turn.deltaScore > sum)
						$turnDetail.append($.i18n('ui-log-total', turn.deltaScore));
				}
				break;
			case 'swap':
				$turnDetail.append($.i18n('ui-log-swap', turn.replacements.length));
				break;
			case /*i18n ui-log-*/'timeout':
			case /*i18n ui-log-*/'pass':
			case /*i18n ui-log-*/'challenge-won':
			case /*i18n ui-log-*/'challenge-failed':
			case /*i18n ui-log-*/'took-back':
				$turnDetail.append($.i18n(`ui-log-${turn.type}`));
			case 'Game over':
				break;
			default:
				// Terminal, no point in translating
				throw Error(`Unknown move type ${turn.type}`);
			}
			this.log($turnDetail, 'turnDetail');

			if (latestTurn
				&& typeof turn.emptyPlayer === 'number'
				&& turn.emptyPlayer >= 0
				&& !this.game.hasEnded()
				&& turn.type !== 'challenge-failed'
				&& turn.type !== 'Game over') {
				if (this.isPlayer(turn.emptyPlayer)) {
					if (typeof turn.nextToGo !== 'number')
						turn.nextToGo = this.game.whosTurn;
					this.log(
						$.i18n('ui-log-you-no-more-tiles',
							   this.game.getPlayer(turn.nextToGo).name),
						'turnNarrative');
				} else
					this.log(
						$.i18n('ui-log-they-no-more-tiles',
							   this.game.getPlayer(turn.emptyPlayer).name),
					'turnNarrative');
			}
		}

		/**
		 * Append a formatted 'end of game' message to the log
		 * @param {boolean} cheer true if a cheer is to be played
		 */
		logEndMessage(cheer) {
			const game = this.game;
			const adjustments = [];
			const winningScore = game.winningScore();
			const winners = [];
			let iWon = false;

			// When the game ends, each player's score is reduced by
			// the sum of their unplayed letters. If a player has used
			// all of his or her letters, the sum of the other players'
			// unplayed letters is added to that player's score. The
			// score adjustments are already done, on the server side,
			// we just need to present the results.
			const unplayed = game.players.reduce(
				(sum, player) => sum + player.rack.score(), 0);
			const $narrative = $('<div></div>');
			game.players.forEach(player => {
				const isMe = this.isPlayer(player.index);
				const name = isMe ? $.i18n('You') : player.name;
				const $gsd = $('<div class="gameEndScore"></div>');

				if (player.score === winningScore) {
					if (isMe) {
						iWon = true;
						if (cheer)
							this.playAudio('endCheer');
					}
					winners.push(name);
				} else if (isMe && cheer)
					this.playAudio('lost');

				if (player.rack.isEmpty()) {
					if (unplayed > 0)
						$gsd.text($.i18n('ui-log-gained-from-racks',
										 name, unplayed));
				} else if (player.rack.score() > 0) {
					// Lost sum of unplayed letters
					$gsd.text($.i18n(
						'ui-log-lost-for-rack',
						name, player.rack.score(),
						player.rack.lettersLeft().join(',')));
				}

				$narrative.append($gsd);
			});

			let who;
			if (winners.length == 0)
				who = '';
			else if (winners.length == 1)
				who = winners[0];
			else
				who = $.i18n('ui-log-name-name',
							 winners.slice(0, winners.length - 1).join(', '),
							 winners[winners.length - 1]);

			this.log($.i18n(game.state));
			if (iWon && winners.length === 1) 
				this.log($.i18n('ui-log-winner-you'));
			else
				this.log($.i18n('ui-log-winner', who, winners.length));

			this.log($narrative);

			this.addContinuationGameButton(game.nextGameKey);
		}

		/**
		 * Process an incoming socket event to add a message to the
		 * chat pane. Message text that matches an i18n message
		 * identifier will be automatically translated with supplied
		 * message args.
		 * @param {object} message message object { sender: string,
		 * text: i18n message identifier or plain text, args[]: i18n arguments
		 */
		processMessage(message) {
			let args = [ message.text ];
			if (typeof message.args === 'string')
				args.push(message.args);
			else if (message.args instanceof Array)
				args = args.concat(message.args);
			let msg = $.i18n.apply(null, args);
			msg = `<span class="chatMessage">${msg}</span>`;
			console.debug(`Server: Message ${msg}`);

			const sender = /^chat-/.test(message.sender)
				  ? $.i18n(message.sender) : message.sender;
			const pn = `<span class='playerName'>${sender}</span>`;

			const $mess = $(`<div>${pn}: ${msg}</div>`);
			$('#chatMessages')
			.append($mess)
			.animate({
				scrollTop: $('#chatMessages').prop('scrollHeight')
			}, 100);

			// Special handling for Hint, highlight square
			if (message.sender === 'Advisor'
				&& args[0] === 'Hint') {
				let row = args[2] - 1, col = args[3] - 1;
				$(`#Board_${col}x${row}`).addClass('hintPlacement');
			}
		}

		/**
		 * Process a tick from the server. Does nothing in an untimed game.
		 * @param {object} tick {player: number, timeout: number }
		 */
		processTick(tick) {
			const $to = $('#timeout')
				  .removeClass('tick-alert-high tick-alert-medium tick-alert-low');
			if (tick.timeRemaining <= 0) {
				$to.hide();
				return;
			}
			let stick = '';
			if (this.isPlayer(tick.player)) {
				this.player.timeRemaining = tick.timeRemaining;
				stick = $.i18n('ui-tick-you', Math.floor(tick.timeRemaining));
				if (tick.timeRemaining < 10 && this.settings.warnings)
					this.playAudio('tick');
				if (tick.timeRemaining < 15)
					$to.fadeOut(100).addClass('tick-alert-high');
				else if (tick.timeRemaining < 45)
					$to.fadeOut(100).addClass('tick-alert-medium');
				else if (tick.timeRemaining < 90)
					$to.fadeOut(100).addClass('tick-alert-low');
			}
			else
				stick = $.i18n('ui-tick-them',
							   this.game.getPlayer(tick.player).name,
							   tick.timeRemaining);
			$to.text(stick).fadeIn(200);
		}

		/**
		 * Handle game-ended confirmation. This confirmation will come after
		 * a player confirms that the previous player's turn is acceptable
		 * and they don't intend to challenge.
		 * @param {string} endState reason why game ended (i18n message id)
		 */
		processGameOverConfirmed(endState) {
			this.game.state = endState;
			// unplace any pending move
			this.takeBackTiles();
			this.logEndMessage(this.settings.cheers);
			this.notify($.i18n('ui-notify-title-game-over'),
						$.i18n('ui-notify-body-game-over'));
		}

		/**
		 * Handle a keydown. These are captured in the root of the UI and dispatched here.
		 */
		handleKeydown(event) {
			switch (event.key) {

            case "ArrowUp": case "Up":
                this.moveTypingCursor(0, -1);
                break;

            case "ArrowDown": case "Down":
                this.moveTypingCursor(0, 1);
                break;

            case "ArrowLeft": case "Left":
                this.moveTypingCursor(-1, 0);
                break;

            case "ArrowRight": case "Right":
                this.moveTypingCursor(1, 0);
                break;

            case "Backspace":
            case "Delete": // Remove placement behind typing cursor
                this.unplaceLastTyped();
                break;

			case "Home": // Take back letters onto the rack
				this.takeBackTiles();
				break;

			case "End": // Commit to move
				this.commitMove();
				break;

			case '@': // Shuffle rack
				this.shuffleRack();
				break;

			case '?': // Pass
				this.pass();
				break;

			case '!': // Challenge
				{
					const lastTurn = this.game.turns.length && this.game.turns[this.game.turns.length - 1];
					if (lastTurn && lastTurn.type == 'move') {
						if (this.isPlayer(this.game.whosTurn))
							// Challenge last move
							this.challenge();
						else
							// Still us
							this.takeBackMove();
					}
				}
				break;

			case '2': case '"': // and type until return
				break;

			case '8': case '*': // to place typing cursor in centre (or first empty cell)
				{
					const mr = Math.floor(this.game.board.rows / 2);
					const mc = Math.floor(this.game.board.cols / 2);
					let sq = this.game.board.at(mc, mr);
					if (!sq.isEmpty()) {
						this.game.board.forEachSquare(
							boardSquare => {
								if (boardSquare.isEmpty()) {
									sq = boardSquare;
									return true;
								}
								return false;
							});
					}
					this.selectSquare(sq);
				}
				break;

			case ' ':
				this.rotateTypingCursor();
				break;

			default:
				this.manuallyPlaceLetter(event.key.toUpperCase());
				break;
			}
		}

		/**
		 * Show who's turn it is
		 */
		updateWhosTurn(whosTurn) {
			$('tr.whosTurn').removeClass('whosTurn');
			$(`#player${whosTurn}`).addClass('whosTurn');
			$('#yourPlayBlock').css(
				'display', this.isPlayer(whosTurn) ? 'block' : 'none');
		}

		/**
		 * Update the display of the number of tiles remaining in the
		 * letter bag and player's racks. This includes showing the
		 * swap rack, if enough tiles remain in the bag.
		 */
		updateTileCounts() {
			const remains = this.game.letterBag.remainingTileCount();
			if (remains > 0) {
				const mess = $.i18n('ui-bag-remaining', remains);
				$('#letterbagStatus').html(`<div>${mess}</div>`);
				$('#scoresBlock td.remainingTiles').empty();
			} else {
				$('#letterbagStatus').text($.i18n('ui-bag-empty'));
				const countElements = $('#scoresBlock td.remainingTiles');
				this.game.players.forEach(
					(player, i) =>
					$(countElements[i]).text(`(${player.rack.squaresUsed()})`));
			}
			if (remains < this.game.board.rackCount)
				$('#swapRack').hide();
			else
				$('#swapRack').show();
		}

		/**
		 * Identify the logged-in user, and make sure they are playing
		 * in this game.
		 * @param {Game} game the game
		 * @return {Promise} a promise that resolves to the player key
		 * or undefined if the player is not logged in or is not in the game
		 */
		identifyPlayer(game) {
			$(".login-state").hide();
			return $.get("/session")
			.then(session => {
				console.log("Signed in as", session.user.name);
				const pks = game.players.map(p=>p.key);
				if (pks.indexOf(session.user.key) >= 0) {
					$("#logged-in")
					.show()
					.find("#whoami")
					.text($.i18n('um-logged-in-as', session.user.name));
					return session.user.key;
				}
				$("#bad-user>span")
				.text($.i18n("Not playing", session.user.name));
				$("#bad-user>button")
				.on("click", () => {
					$.post("/logout")
					.then(() => location.replace(location));
				});
				$("#bad-user").show();
				return undefined;
			})
			.catch(e => {
				console.log(e);
				$("#not-logged-in")
				.show()
				.find("button")
				.on("click", () => 	Dialog.open("LoginDialog", {
					done: () => location.replace(location),
					error: report
				}));
				return Promise.resolve();
			});
		}

		/**
		 * A game has been read; load it into the UI
		 * @param {Game} game the Game being played
		 * @param {string?} playerKey player key, if player is in this game
		 * undefined if not
		 * @return {Promise} Promise that resolves to a game
		 */
		loadGame(game, playerKey) {
			console.log('Loading UI for', game.toString());

			this.game = game;

			// Number of tiles placed on the board since the last turn
			this.placedCount = 0;

			// Can swap up to swapCount tiles
			this.swapRack = new Rack(this.game.board.swapCount);

			this.player = this.game.getPlayerWithKey(playerKey);
			const $players = this.game.createPlayerTableDOM(this.player);
			$('#playerTable').append($players);

			if (this.player) {
				$('#tileRack').append(this.player.rack.createDOM('Rack'));

				$('#swapRack').append(this.swapRack.createDOM('Swap', 'SWAP'));
				this.swapRack.refreshDOM();
			}

			const $board = this.game.board.createDOM();
			$('#board').append($board);

			const gs = $.i18n('Game started');
			$('#logMessages').append(`<p class='gameStart'>${gs}</p>`);
			if (game.time_limit > 0)
				$("#timeout").show();
			else 
				$("#timeout").hide();

			game.turns.forEach(
				(turn, i) => this.appendTurnToLog(turn, i === game.turns.length - 1));

			if (game.hasEnded())
				this.logEndMessage(false);

			this.scrollLogToEnd(0);

			this.updateWhosTurn(game.whosTurn);
			const myGo = this.isPlayer(game.whosTurn);
			this.lockBoard(!myGo);
			this.enableTurnButton(myGo);

			this.updateGameStatus();

			const lastTurn = game.turns.length
				  && game.turns[game.turns.length - 1];

			if (lastTurn && (lastTurn.type === 'move'
							 || lastTurn.type === 'challenge-failed')) {
				if (this.isPlayer(game.whosTurn)) {
					// It's our turn
					this.addChallengePreviousButton(lastTurn);
				} else
					// It isn't our turn, but we might still have time to
					// change our minds on the last move we made
					this.addTakeBackPreviousButton(lastTurn);
			}

			if (this.player) {
				$('#shuffleButton').button({
					showLabel: false,
					icon: 'shuffle-icon',
					title: $.i18n("Shuffle"),
					classes: {
						'ui-button-icon': 'crossword-icon'
					}
				})
				.on('click', () => this.shuffleRack());
			
				$('#takeBackButton').button({
					showLabel: false,
					icon: 'take-back-icon',
					title: $.i18n('Take back'),
					classes: {
						'ui-button-icon': 'crossword-icon'
					}				
				})
				.on('click', () => this.takeBackTiles());

				$('#turnButton').on('click', () => this.makeMove());
			} else {
				$('#shuffleButton').hide();
				$('#turnButton').hide();
			}
			
			this.$typingCursor = $('#typingCursor');
			this.$typingCursor.hide(0);

			this.refresh();

			return Promise.resolve();
		}

		/**
		 * Attach socket communications listeners
		 */
		attachSocketListeners() {

			this.socket = Socket.connect(null);

			let $reconnectDialog = null;

			this.socket

			.on('connect', () => {
				if ($reconnectDialog) {
					$reconnectDialog.dialog('close');
					$reconnectDialog = null;
				}
				console.debug('Server: Socket connected');
				if (this.wasConnected) {
					this.cancelNotification();
				} else {
					this.wasConnected = true;
					this.socket.emit('join', {
						gameKey: this.game.key,
						playerKey: this.player ? this.player.key : undefined
					});
				}
			})

			.on('disconnect', () => {
				console.debug('Socket disconnected');
				$reconnectDialog = $('#alertDialog')
				.text($.i18n('ui-server-disconnected'))
				.dialog({ modal: true });
				const ui = this;
				setTimeout(() => {
					// Try and rejoin after a 3s timeout
					ui.socket.emit('join', {
						gameKey: this.game.key,
						playerKey: this.player ? this.player.key : undefined
					});
				}, 3000);

			})

			// Custom events

			.on('connections', info => {
				// Update active connections
				for (let player of this.game.players)
					player.online(false);
				for (let key of info) {
					const player = this.game.getPlayerWithKey(key);
					if (player)
						player.online(true);
				}
			})

			.on('turn', turn => this.processTurn(turn))

			.on('tick', tick => this.processTick(tick))

			.on('gameOverConfirmed', endState =>
				this.processGameOverConfirmed(endState))

			.on('nextGame',	nextGameKey =>
				this.addContinuationGameButton(nextGameKey))

			.on('message', message => this.processMessage(message))

			.on('pause', player => this.pause(player, true))

			.on('unpause', player => this.pause(player, false));
		}

		/**
		 * By using a modal dialog to report the pause, we block further
		 * interaction until the pause is released.
		 * @param {string} player name of player who paused/released
		 * @param {boolean} isPaused whether the game is to be paused/released
		 * @private
		 */
		pause(player, isPaused) {
			console.log(`${player} has ${isPaused?"":"un"}paused`);
			if (isPaused) {
				$(".Letter").addClass("hidden");
				$(".Score").addClass("hidden");
				$('#pauseDialog')
				.find("[name=banner]")
				.text($.i18n('ui-unpause-text', player));
				$('#pauseDialog')
				.dialog({
					dialogClass: "no-close",
					modal: true,
					buttons: [
						{
							text: $.i18n('Continue game'),
							click: () => {
								this.sendCommand('unpause');
								$('#pauseDialog').dialog("close");
							}
						}
					]});
			} else {
				$(".Letter").removeClass("hidden");
				$(".Score").removeClass("hidden");
				$("#pauseButton")
				.button("option", "label", $.i18n('Pause game'));
				$('#pauseDialog')
				.dialog("close");
			}
		}

		/**
		 * Attach listeners for jquery and game events
		 */
		attachHandlers() {
			const ui = this;

			// Configure chat input
			$('#chatInput input')
			.on('change', function() {
				// Send chat
				ui.socket.emit(
					'message',
					{
						sender: ui.player.name,
						text: $(this).val()
					});
				$(this).val('');
			});

			// Load settings from the cookie (if it's there) and
			// configure the gear button
			const sets = $.cookie(SETTINGS_COOKIE);
			if (sets)
				sets.split(";").map(
					s => {
						const v = s.split('=');
						this.settings[v[0]] = (v[1] === 'true');
					});

			$('#settings')
			.on('click', () => {
				$("#pauseButton").toggle(this.game.time_limit > 0);
				$('#settingsDialog')
				.dialog({
					title: $.i18n('Options'),
					modal: true
				});
			});

			$('input.setting')
			.each(function() {
				$(this).prop('checked', ui.settings[$(this).data('set')]);
			})
			.on('change', function() {
				ui.settings[$(this).data('set')] = $(this).prop('checked');
				$.cookie(SETTINGS_COOKIE,
						 Object.getOwnPropertyNames(ui.settings)
						 .map(k => {
							 return `${k}=${ui.settings[k]}`;
						 }).join(';'),
						 {
							 SameSite: "Strict"
						 });
			});

			$("#pauseButton").button({})
			.on('click', () => this.sendCommand("pause"));

			if (!this.usingHttps) {
				// Notification requires https
				$("input.setting[data-set='notification']")
				.prop('disabled', true);
			}
			
			// Events raised by game components
			$(document)
			.on('SquareChanged',
				(e, square) => square.refreshDOM())

			.on('SelectSquare',
				(e, square) => this.selectSquare(square))

			.on('DropSquare',
				(e, source, square) => this.dropSquare(source, square))

			// Keydown anywhere in the game
			.on('keydown', event => this.handleKeydown(event));
		}

		// Handle a letter being typed when the typing cursor is active
		manuallyPlaceLetter(letter) {
			if (!this.selectedSquare || !this.selectedSquare.isEmpty())
				return;
			
			if (this.game.letterBag.legalLetters.indexOf(letter) < 0) // check it's supported
				return;

			// Find the letter in the rack
			const rackSquare = this.player.rack.findSquare(letter);
			if (rackSquare) {
				// moveTile will use a blank if the letter isn't found
				this.moveTile(rackSquare, this.selectedSquare, letter);
				if (this.settings.tile_click)
					this.playAudio('tiledown');
				if (this.typeAcross)
					this.moveTypingCursor(1, 0);
				else
					this.moveTypingCursor(0, 1);
			} else
				$('#logMessages').append($.i18n('ui-log-letter-not-on-rack', letter));
		}

		/**
		 * When a letter has been typed, move the cursor skipping over tiles. If the
		 * edge of the board is reached, ignore the move.
		 */
		moveTypingCursor(col, row) {
			if (!this.selectedSquare)
				return;
			do {
				try {
					const nusq = this.game.board.at(
						this.selectedSquare.col + col, this.selectedSquare.row + row);
					this.selectedSquare = nusq;
				} catch (e) {
					// off the board
					this.selectedSquare = undefined;
				}
			} while (this.selectedSquare && !this.selectedSquare.isEmpty());
			if (this.selectedSquare)
				this.selectedSquare.setSelected(true);
			this.updateTypingCursor();
		}

		/**
		 * Square selection is used for click-click moves when dragging
		 * isn't available
		 */
		selectSquare(square) {
			if (square) {
				console.log(`select ${square.id}`);
			}

			if (this.selectedSquare) {
				// Is a square already selected?
				if (!this.selectedSquare.isEmpty()) {
					// The the destination available for a move?
					if (square && square.isEmpty() && square !== this.selectedSquare) {
						this.moveTile(this.selectedSquare, square);
					}
				} else if (square === this.selectedSquare) {
					this.rotateTypingCursor();
				}
				this.selectedSquare.setSelected(false);
			}
			this.selectedSquare = square;
			if (square) {
				this.selectedSquare.setSelected(true);
			}
			this.updateTypingCursor();
		}

		/**
		 * Swap the typing cursor between across and down
		 */
		rotateTypingCursor() {
			if (this.typeAcross) {
				this.$typingCursor.html('&#8659;'); // Down arrow
				this.typeAcross = false;
			} else {
				this.$typingCursor.html('&#8658;'); // Right arrow
				this.typeAcross = true;
			}
		}

		/**
		 *  Update the typing cursor DOM to sit over the selectedSquare
		 */
		updateTypingCursor() {
			if (this.selectedSquare && this.selectedSquare.isEmpty()) {
				const $dom = $(`#${this.selectedSquare.id}`);
				$dom.prepend(this.$typingCursor);
				this.$typingCursor.show();
			} else
				this.$typingCursor.hide();
		}

		/**
		 *  If the typing cursor is active, move back in the direction
		 * it is set to an unplace the next unlocked tile encountered
		 */
		unplaceLastTyped() {
			if (!this.selectedSquare || this.$typingCursor.is(":hidden"))
				return;
			let row = 0, col = 0;
			if (this.typeAcross)
				col = -1;
			else
				row = -1;
			let sq = this.selectedSquare;
			do {
				try {
					sq = this.game.board.at(sq.col + col, sq.row + row);
				} catch (e) {
					// off the board
					sq = undefined;
				}
			} while (sq && sq.tileLocked);
			if (sq && sq.tile) {
				// Unplace the tile, returning it to the rack
				this.takeBackTile(sq);
				this.selectSquare(sq);
				this.updateTypingCursor();
			}
		}

		/**
		 *  Handler for 'DropSquare' event, invoked when a draggable has
		 * been dropped on a square.
		 */
		dropSquare(source, square) {
			this.moveTile(source, square);
			this.selectSquare(null);
			if (this.settings.tile_click)
				this.playAudio('tiledown');
		}

		refresh() {
			if (this.player)
				this.player.rack.refreshDOM();
			this.game.board.refreshDOM();
			if (this.game.pausedBy)
				this.pause(this.game.pausedBy, true);
		}

		/**
		 * Promise to prompt for a letter for a blank
		 * @return {Promise} Promise that resolves to the chosen letter
		 */
		promptForLetter() {
			return new Promise(resolve => {
				const $dlg = $('#blankDialog');
				const $tab = $('#blankLetterTable');
				$tab.empty();
				const ll = this.game.letterBag.legalLetters.slice().sort();
				const dim = Math.ceil(Math.sqrt(ll.length));
				let rowlength = dim;
				let $row = null;
				while (ll.length > 0) {
					const letter = ll.shift();
					if (rowlength == dim) {
						if ($row)
							$tab.append($row);
						$row = $('<tr></tr>');
						rowlength = 0;
					}
					const $td = $(`<td>${letter}</td>`);
					$td.on('click', () => {
						$dlg.dialog('close');
						resolve(letter);
					});
					$row.append($td);
					rowlength++;
				}
				if ($row)
					$tab.append($row);

				$dlg.dialog({
					modal: true,
					closeOnEscape: false,
					closeText: 'hide'
				});
			});
		}

		/**
		 * Move a tile from one surface to another e.g. from the
		 * rack to the board
		 * @param {Square} fromSquare the square the tile is coming from
		 * @param {Square} toSquare the square the tile is moving to
		 * @param {string} ifBlank (optional) if the tile is blank and we are
		 * moving it to the board, then assign it this letter. Otherwise
		 * a dialog will prompt for the letter.
		 */
		moveTile(fromSquare, toSquare, ifBlank) {
			if (this.boardLocked)
				return;

			const tile = fromSquare.tile;

			if (fromSquare.owner instanceof Board) {
				if (!(toSquare.owner instanceof Board))
					this.placedCount--;
			} else if (toSquare.owner instanceof Board)
				this.placedCount++;

			fromSquare.placeTile(null);
			if (tile.isBlank) {			
				if (!(toSquare.owner instanceof Board)) {
					// blanks are permitted
					tile.letter = ' ';
					toSquare.refreshDOM();
				} else if (ifBlank) {
					tile.letter = ifBlank;
					toSquare.refreshDOM();
				} else {
					this.promptForLetter()
					.then(letter => {
						tile.letter = letter;
						toSquare.refreshDOM();
					});
				}
			}
			toSquare.placeTile(tile);
			window.setTimeout(() => this.updateGameStatus(), 500);
		}

		updateGameStatus() {
			$('#move').empty();
			this.updateTileCounts();

			// if the last player's rack is empty, it couldn't be refilled
			// and the game might be over.
			const lastPlayer = this.game.previousPlayer();
			if (!this.game.hasEnded()
				&& this.game.getPlayer(lastPlayer).rack.isEmpty()) {
				this.lockBoard(true);
				this.setMoveAction(/*i18n ui-*/'confirmGameOver');
			} else if (this.placedCount > 0) {
				// Player has dropped some tiles on the board
				// (tileCount > 0), move action is to make the move
				this.setMoveAction(/*i18n ui-*/'commitMove');
				const move = this.game.board.analyseMove();
				if (typeof move === 'string') {
					$('#move').append($.i18n(move));
					$('#turnButton').attr('disabled', 'disabled');
				} else {
					for (const word of move.words) {
						$('#move')
						.append(`<span class="word">${word.word}</span>`)
						.append(' (')
						.append(`<span class="wordScore">${word.score}</span>`)
						.append(') ');
					}
					const total = $.i18n('ui-log-total', move.score);
					$('#move').append(`<span class="totalScore">${total}</span>`);
					$('#turnButton').removeAttr('disabled');
				}

				// Use visibility and not display to keep the layout stable
				$('#takeBackButton').css('visibility', 'inherit');
				$('#swapRack').hide();
			} else if (this.swapRack.squaresUsed() > 0) {
				// Swaprack has tiles on it, change the move action to swap
				this.setMoveAction(/*i18n ui-*/'swap');
				$('#board .ui-droppable').droppable('disable');
				$('#turnButton').removeAttr('disabled');
				$('#takeBackButton').css('visibility', 'inherit');
			} else if (!this.game.hasEnded()) {
				// Otherwise turn action is a pass
				this.setMoveAction(/*i18n ui-*/'pass');
				$('#board .ui-droppable').droppable('enable');
				$('#turnButton').removeAttr('disabled');
				$('#takeBackButton').css('visibility', 'hidden');
			}
		}

		/**
		 * Set board locked status. The board is locked when it's
		 * not this player's turn.
		 * @param {boolean} newVal new setting of "locked"
		 */
		lockBoard(newVal) {
			this.boardLocked = newVal;
			this.game.board.refreshDOM();
		}

		/**
		 * Enable/disable the turn button
		 * @param {boolean} enable true to enable, disable otherwise
		 */
		enableTurnButton(enable) {
			if (enable)
				$('#turnButton').removeAttr('disabled');
			else
				$('#turnButton').attr('disabled', 'disabled');
		}

		/**
		 * Process a Turn object received from the server. 'turn' events
		 * are sent by the server when an action by any player has
		 * modified the game state.
		 * @param {Turn} turn a Turn object
		 */
		processTurn(turn) {
			console.debug('Turn ', turn);
			// Take back any locally placed tiles
			this.game.board.forEachSquare(
				boardSquare => {
					if (this.takeBackTile(boardSquare))
						this.placedCount--;
				});

			this.appendTurnToLog(turn, true);
			this.scrollLogToEnd(300);
            this.removeMoveActionButtons();
			const player = this.game.getPlayer(turn.player);
			if (typeof turn.deltaScore === 'number')
				player.score += turn.deltaScore;
			else if (typeof turn.deltaScore !== 'undefined')
				turn.deltaScore.forEach(
					(d, i) => this.game.players[i].score += d);

			player.refreshDOM();
			$('.lastPlacement').removeClass('lastPlacement');

			switch (turn.type) {
			case 'challenge-won':
			case 'took-back':
				// Move new tiles out of challenged player's rack
				// into the bag
				for (let newTile of turn.replacments) {
					const tile = player.rack.removeTile(newTile);
					this.game.letterBag.returnTile(tile);
				}

				// Take back the placements from the board into the
				// challenged player's rack
				for (const placement of turn.placements) {
					const square = this.game.at(placement.col, placement.row);
					const recoveredTile = square.tile;
					square.placeTile(null);
					player.rack.addTile(recoveredTile);
				}

				// Was it us?
				if (this.isPlayer(turn.player)) {
					// Only really needed for took-back
					player.rack.refreshDOM();
					if (turn.type === 'challenge-won') {
						if (this.settings.warnings)
							this.playAudio('oops');
						this.notify(
							$.i18n('ui-notify-title-challenged'),
							$.i18n('ui-notify-body-challenged',
								   this.game.getPlayer(turn.challenger).name,
								   -turn.score));
					}
				}

				if (turn.type == 'took-back') {
					this.notify(
						$.i18n('ui-notify-title-retracted'),
						$.i18n('ui-notify-body-retracted',
							   this.game.getPlayers(turn.challenger).name));
				}
				break;

			case 'challenge-failed':
				if (this.isPlayer(turn.player)) {
					// Our challenge failed
					if (this.settings.warnings)
						this.playAudio('oops');
					this.notify(
						$.i18n('ui-notify-title-you-failed'),
						$.i18n('ui-notify-body-you-failed'));
				} else {
					if (this.settings.warnings)
						this.playAudio('oops');
					this.notify(
						$.i18n('ui-notify-title-they-failed'),
						$.i18n('ui-notify-body-they-failed', player.name));
				}
				break;

			case 'move':
				if (!this.isPlayer(turn.player)) {
					// Put the tiles placed in a turn into place on
					// the board for a player who is not this player (they
					// are already there for this player)
					for (let placement of turn.placements) {
						const square = this.game.at(placement.col, placement.row);
						player.rack.removeTile(placement);
						square.placeTile(placement, true); // lock it down
						// Highlight it as just placed
						const $div = $(`#Board_${placement.col}x${placement.row}`);
						$div.addClass('lastPlacement');
					}
				}
				// Shrink the bag by the number of placed tiles. This is purely
				// to keep the counts in synch, we never use tiles taken
				// from the bag on the client side.
				this.game.letterBag.getRandomTiles(
					this.game.letterBag.remainingTileCount() - turn.leftInBag);

				// Deliberate fall-through to 'swap'

			case 'swap':
				// Add new tiles to the rack
				for (let newTile of turn.replacements)
					player.rack.addTile(newTile);

				if (this.isPlayer(turn.player))
					player.rack.refreshDOM();

				break;

			case 'Game over':
				break;
			}

			if (this.isPlayer(turn.nextToGo)) {
				if (this.settings.turn_alert)
					this.playAudio('yourturn');
				this.lockBoard(false);
				this.enableTurnButton(true);
			} else {
				this.lockBoard(true);
				this.enableTurnButton(false);
			}

			if (typeof turn.nextToGo === 'number'
				&& turn.type !== 'challenge-won') {

				this.updateWhosTurn(turn.nextToGo);
				if (turn.type == 'move')
					this.addTakeBackPreviousButton(turn);

				if (this.isPlayer(turn.nextToGo)
					&& turn.type !== 'took-back') {
					// It's our turn, and we didn't just take back
					this.notify($.i18n('ui-notify-title-your-turn'),
								$.i18n('ui-notify-body-your-turn',
									   this.game.getPlayer(turn.player).name));

					if (turn.type === 'move')
						this.addChallengePreviousButton(turn);
				}
				this.game.whosTurn = turn.nextToGo;
			}
			this.updateGameStatus();
		}

		/**
		 * After a move, remove the move information and lock the board
		 * until it's our turn again
		 */
		afterMove() {
			this.removeMoveActionButtons();
			$('#move').empty();
			this.lockBoard(true);
			this.enableTurnButton(false);
		}

		/**
		 * Append a formatted 'next game' message and button to the log
		 * @param {string} nextGameKey key for next game
		 */
		addContinuationGameButton(nextGameKey) {
			const $but = $('<button></button>');
			if (nextGameKey) {
				$('.anotherGame').remove();
				$but
				.text($.i18n("Next game"))
				.on('click',
					() => $.post(`/join/${nextGameKey}/${this.player.key}`)
					.then(info => {
						location.replace(
							`/html/game.html?game=${nextGameKey}&player=${this.player.key}`);
					}));
				this.log($but);
			} else {
				$but
				.addClass('anotherGame')
				.text($.i18n('Another game'))
				.on('click',
					() => $.post(`/anotherGame/${this.game.key}`));
				this.log($but, 'turnControl');
				this.log($.i18n('ui-log-same-players'));
			}
			this.scrollLogToEnd(300);
		}

		/**
		 * Add a 'Challenge' button to the log pane to challenge the last
		 * player's move (if it wasn't us)
		 */
		addChallengePreviousButton(turn) {
			if (this.isPlayer(turn.player))
				return;
			// It wasn't us
			const text = $.i18n(
				'ui-challenge',
				this.game.getPlayer(turn.player).name);
			const $button =
				  $(`<button class='moveAction'>${text}</button>`);
			$button.click(() => this.challenge());
			this.log($button, 'turnControl');
			this.scrollLogToEnd(300);
		}

		/**
		 * Add a 'Take back' button to the log pane to take back
		 * (this player's) previous move.
		 */
		addTakeBackPreviousButton(turn) {
			if (!this.isPlayer(turn.player))
				return;
			// It's us!
			const $button =
				  $(`<button class='moveAction'>${$.i18n('Take back')}</button>`);
			$button.click(() => this.takeBackMove());
			this.log($button, 'turnControl');
			this.scrollLogToEnd(300);
		}

		/**
		 * Remove any action buttons from the log pane.
		 */
		removeMoveActionButtons() {
			$('button.moveAction').remove();
		}

		/**
		 * Action on 'Challenge' button clicked
		 */
		challenge() {
			// Take back any tiles we placed
			this.takeBackTiles();
			// Remove action buttons and lock board
			this.afterMove();
			this.sendCommand('challenge');
		}

		/**
		 * Handler for the 'Make Move' button. Invoked via 'makeMove'.
		 */
		commitMove() {
			$('.hintPlacement').removeClass('hintPlacement');

			const move = this.game.board.analyseMove();
			if (typeof move === 'string') {
				// fatal - should never get here
				report(move);
				return;
			}
			this.afterMove();
			if (move.bonus > 0 && this.settings.cheers)
				this.playAudio('bonusCheer');

			for (let i = 0; i < move.placements.length; i++) {
				const tilePlaced = move.placements[i];
				const square = this.game.at(tilePlaced.col, tilePlaced.row);
				square.tileLocked = true;
				square.refreshDOM();
			}
			this.placedCount = 0;

			move.player = this.player.index;

			this.sendCommand('makeMove', move);
		}

		/**
		 * Handler for the 'Take back' button clicked. Invoked via 'makeMove'.
		 */
		takeBackMove() {
			this.takeBackTiles();
			this.afterMove();
			this.sendCommand('takeBack');
		}

		/**
		 * Handler for the 'Pass' button clicked. Invoked via 'makeMove'.
		 */
		pass() {
			this.takeBackTiles();
			this.afterMove();
			this.sendCommand('pass');
		}

		/**
		 * Handler for the 'Confirm move' button clicked. Invoked
		 *  via 'makeMove'. The response may contain a score adjustment.
		 */
		confirmGameOver() {
			this.takeBackTiles();
			this.afterMove();
			this.sendCommand('confirmGameOver');
		}

		/**
		 * Handler for the 'Swap' button clicked. Invoked via 'makeMove'.
		 */
		swap() {
			this.afterMove();
			const tiles = this.swapRack.tiles();
			this.swapRack.empty();
			this.sendCommand('swap', tiles);
		}

		/**
		 * Set the action when the turn button is pressed.
		 * @param {string} action function name e.g. commitMove
		 * @private
		 */
		setMoveAction(action) {
			$('#turnButton')
			.data('action', action)
			.empty()
			.append($.i18n(`ui-${action}`));
		}

		/**
		 * Handler for a click on the 'Make Move' button. This button
		 * may be associated with different actions depending on the
		 * state, through the 'data-action' attribute.
		 * 
		 * * 'commitMove' will send the current tile placements to the server
		 * * 'swap' will sawp the tiles currently on the swap rack
		 * * 'pass' will pass the current move (set when no tiles are placed)
		 *
		 * This action will map to the matching function in 'this'.
		 */
		makeMove() {
			const action = $('#turnButton').data('action');
			console.debug('makeMove =>', action);
			this[action]();
		}

		/**
		 * Handler for a click on the 'Take Back' button, to pull
		 * back tiles from the board and swap rack
		 */
		takeBackTiles() {
			this.game.board.forEachSquare(
				boardSquare => {
					if (this.takeBackTile(boardSquare))
						this.placedCount--;
				});
			this.swapRack.forEachSquare(
				swapSquare => this.takeBackTile(swapSquare));
			this.updateGameStatus();
		}

		/**
		 * Take back a single tile from the given square
		 * @return {boolean} true if a tile was returned
		 */
		takeBackTile(square) {
			if (!square.tile || square.tileLocked)
				return false;

			// Find a space on the rack for it
			let freesquare = undefined;
			this.player.rack.forEachSquare(square => {
				if (!square.tile) {
					freesquare = square;
					return true;
				}
				return false;
			});

			// Move the tile back to the rack
			freesquare.tile = square.tile;
			if (square.tile.isBlank)
				square.tile.letter = ' ';
			freesquare.refreshDOM();
			square.tile = null;
			square.refreshDOM();
			return true;
		}

		/**
		 * Handler for click on the 'Shuffle' button
		 */
		shuffleRack() {
			this.player.rack.shuffle().refreshDOM();
		}

		/**
		 * Generate a notification using the HTML5 notifications API
		 */
		notify(title, text) {
			this.canNotify()
			.then(() => {
			this.cancelNotification();
				const notification = new Notification(
					title,
					{
						icon: '/images/favicon.ico',
						body: text
					});
				this.notification = notification;
				$(notification)
				.on('click', function () {
					this.cancel();
				})
				.on('close', () => {
					delete this.notification;
				});
			})
			.catch(() => {});
		}

		/**
		 * Promise to check if we have been granted permission to
		 * create Notifications.
		 * @return {Promise} Promise that resolves to undefined if we can notify
		 */
		canNotify() {
			if (!this.settings.notification
				|| !('Notification' in window))
				return Promise.reject();
			switch (Notification.permission) {
			case 'denied':
				return Promise.reject();
			case 'granted':
				return Promise.resolve();
			default:
				return new Promise((resolve, reject) => {
					return Notification.requestPermission()
					.then(result => {
						if (result === 'granted')
							resolve();
						else
							reject();
					});
				});
			}
		}

		/**
		 * Cancel any outstanding Notification
		 */
		cancelNotification() {
			if (this.notification) {
				this.notification.close();
				delete this.notification;
			}
		}
	}

	return Ui;
});
