/* eslint-env browser, jquery */
/* global $, define, Notification */

const uideps = [
	'socket.io',
	'game/Fridge',
	'game/Tile',
	'game/Bag',
	'game/Rack',
	'game/Board',
	'game/Game',
	'jqueryui',
	'cookie',
	'browser/icon_button' ];

define('browser/Ui', uideps, (socket_io, Fridge, Tile, Bag, Rack, Board, Game) => {

	const SETTINGS_COOKIE = 'crossword_settings';

	/**
	 * User interface to a game in a browser. The Ui reflects the game state as
	 * communicated from the server, through the exchange of various messages.
	 * See `FlowOfControl.md` at the root of this distribution for an overview.
	 */
	class Ui {

		constructor() {

			// Are we using https?
			this.https = document.URL.indexOf('https:') === 0;

			this.settings = {
				turn_alert: true,
				cheers: true,
				tile_click: true,
				warnings: true,
				notification: this.https
			};

			const splitUrl = document.URL.match(/.*\/([0-9a-f]+)$/);
			if (!splitUrl)
				throw Error(`cannot parse url ${document.URL}`);
			const gameKey = splitUrl[1];

			/**
			 * Currently selected Square
			 * @member
			 */
			this.selectedSquare = null;

			/**
			 * Quick reference to typing cursor DOM object
			 * lateinit in loadGame
			 * @member
			 */
			this.$typingCursor = null;
			
			/**
			 * Typing is across if true, down if false
			 * @member
			 */
			this.typeAcross = true;

			/**
			 * lateinit in loadGame
			 * @member
			 */
			this.thisPlayer = null;

			/**
			 * Board lock status, private
			 * @member
			 */
			this.boardLocked = false;

			this.attachHandlers();

			// This will GET application/json
			$.get(`/game/${gameKey}`,
				  frozen => {
					  console.log(`Loading game ${gameKey}`);
					  const game = Fridge.thaw(frozen, Game.classes);
					  this.loadGame(game)
					  .then(() => this.attachSocketListeners())
					  .catch(e => {
						  $('#problemDialog')
						  .text(e)
						  .dialog({ modal: true });
					  });
				  });
		}

		/**
		 * True if the current player is the player at the given index
		 */
		isPlayer(index) {
			return this.thisPlayer.index === index;
		}

		/**
		 * Send a game command to the server. Game commands are recognised
		 * by being sent using POST. Moves are 'makeMove', 'challenge',
		 * 'swap', 'takeBack', and 'pass'
		 * @param {string} command command name
		 * @param {object} args arguments for the request body
		 */
		sendCommand(command, args) {
			this.cancelNotification();
			$.post(`/command/${this.game.key}`, {
				command: command,
				// Note we JSON.stringify because $.post will
				// otherwise convert all numbers to strings. PITA!
				args: JSON.stringify(args)
			})
			.fail((jqXHR, textStatus, errorThrown) => {
				console.error(`${command} returned error: ${textStatus} (${errorThrown})`);
			});
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
			this.log($.i18n('log-turn-player', player.name), 'turnPlayer');

			// What did they do?
			const $turnDetail = $('<div></div>');
			switch (turn.type) {
			case 'move':
				{
					// Compose a description of the words created
					let ws = 0;
					let sum = 0;
					for (let word of turn.move.words) {
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
						$turnDetail.append($.i18n('log-total', turn.deltaScore));
				}
				break;
			case 'swap':
				$turnDetail.append($.i18n('log-swap', turn.newTiles.length));
				break;
			case 'timeout':
			case 'pass':
			case 'challenge-won':
			case 'challenge-failed':
			case 'took-back':
				$turnDetail.append($.i18n(`log-${turn.type}`));
			case 'ended-game-over':
				break;
			default:
				// Terminal, no point in translating
				throw Error(`Unknown move type ${turn.type}`);
			}
			this.log($turnDetail, 'turnDetail');

			if (latestTurn
				&& typeof turn.emptyPlayer === "number"
				&& turn.emptyPlayer >= 0
				&& !this.game.ended
				&& turn.type !== 'challenge-failed'
				&& turn.type !== 'ended-game-over') {
				if (this.isPlayer(turn.emptyPlayer)) {
					if (typeof turn.nextToGo !== "number")
						turn.nextToGo = this.game.whosTurn;
					this.log(
						$.i18n(`log-you-no-more-tiles`,
							   this.game.getPlayer(turn.nextToGo).name),
						'turnNarrative');
				} else
					this.log(
						$.i18n(`log-they-no-more-tiles`,
							   this.game.getPlayer(turn.emptyPlayer).name),
					'turnNarrative');
			}
		}

		/**
		 * Append a formatted 'end of game' message to the log
		 */
		logEndMessage(cheer) {
			const winners = [];
			let youWon = false;
			const winningScore = this.game.getWinningScore();

			// Total lost from all losing player's racks
			const extras = this.game.players.reduce(
				(sum, player) => sum + player.rack.score(), 0);

			const $narrative = $('<div></div>');
			this.game.players.forEach(player => {
				const isme = this.isPlayer(player.index);
				const iswinner = (player.score === winningScore);

				const $gsd = $('<div class="gameEndScore"></div>');
				const name = isme ? $.i18n('You') : player.name;

				if (iswinner) {
					if (isme) {
						if (cheer && this.settings.cheers)
							this.playAudio('endCheer');
						youWon = true;
						winners.push($.i18n('you'));
					} else {
						winners.push(player.name);
					}
					if (extras > 0)
						$gsd.text($.i18n('log-gained-from-racks',
										 name, extras));
				} else {
					const waste = player.rack.score();
					if (waste > 0) {
						const tilesLeft = [];
						player.rack.forEachTiledSquare(square => {
							if (!square.tile.isBlank)
								tilesLeft.push(square.tile.letter);
							return false;
						});
						$gsd.text($.i18n(
							'log-lost-for-rack',
							name, waste, tilesLeft.join(',')));
					}
				}
				$narrative.append($gsd);
				player.refreshDOM();
			});

			if (cheer && !youWon && this.settings.cheers)
				this.playAudio('lost');

			let who;
			if (winners.length == 0)
				who = '';
			else if (winners.length == 1)
				who = winners[0];
			else
				who = $.i18n('log-name-name',
							 winners.slice(0, winners.length - 1).join(', '),
							 winners[winners.length - 1]);

			const has = (winners.length == 1 && !youWon) ? 1 : 2;
			this.log($.i18n(this.game.ended, $.i18n('log-winner', who, has)),
					 'gameOverConfirmed');

			this.log($narrative);

			this.addContinuationGameButton(this.game.nextGameKey);
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

			// Special handling for chat-hint, highlight square
			if (message.sender === 'chat-advisor'
				&& args[0] === 'chat-hint') {
				let row = args[2] - 1, col = args[3] - 1;
				$(`#Board_${col}x${row}`).addClass('hintPlacement');
			}
		}

		/**
		 * Process a tick from the server. Does nothing in an untimed game.
		 * @param {object} tick {player: number, timeout: number }
		 */
		processTick(tick) {
			if (tick.timeout === 0)
				return;
			const $to = $('#timeout')
				  .removeClass('tick-alert-high tick-alert-medium tick-alert-low');
			const deltasecs = Math.floor((tick.timeout - Date.now()) / 1000);
			let stick = '';
			if (this.isPlayer(tick.player)) {
				stick = $.i18n('tick-you', deltasecs);
				if (deltasecs < 10 && this.settings.warnings)
					this.playAudio('tick');
				if (deltasecs < 15)
					$to.fadeOut(100).addClass('tick-alert-high');
				else if (deltasecs < 45)
					$to.fadeOut(100).addClass('tick-alert-medium');
				else if (deltasecs < 90)
					$to.fadeOut(100).addClass('tick-alert-low');
			}
			else
				stick = $.i18n('tick-them',
							   this.game.getPlayer(tick.player).name, deltasecs);
			$to.text(stick).fadeIn(200);
		}

		/**
		 * Handle game-ended confirmation. This confirmation will come after
		 * a player confirms that the previous player's turn is acceptable
		 * and they don't intend to challenge.
		 * @param {string} ended i18n message identifier indicating reason
		 * game ending.
		 */
		processGameOverConfirmed(ended) {
			this.game.ended = ended;
			this.takeBackTiles();
			this.logEndMessage(true);
			this.notify($.i18n('notify-title-game-over'),
						$.i18n('notify-body-game-over'));
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
				const mess = $.i18n('letterbag-remaining', remains);
				$('#letterbagStatus').html(`<div>${mess}</div>`);
				$('#scoresBlock td.remainingTiles').empty();
			} else {
				$('#letterbagStatus').text($.i18n('letterbag-empty'));
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
		 * A game has been read; load it into the UI
		 * @param {Game} game the Game being played
		 * @return {Promise} to load the game
		 */
		loadGame(game) {
			console.log('Loading UI for', game.toString());

			this.game = game;

			// Number of tiles placed on the board since the last turn
			this.placedCount = 0;

			// Can swap up to swapCount tiles
			this.swapRack = new Rack(this.game.board.swapCount);

			const playerKey = $.cookie(this.game.key);
			this.thisPlayer = this.game.getPlayerFromKey(playerKey);

			if (!this.thisPlayer)
				return Promise.reject(`Cannot find game cookie ${this.game.key}. Please rejoin the game.`);

			const $players = this.game.createPlayerTableDOM(this.thisPlayer);
			$('#playerTable').append($players);

			const $board = this.game.board.createDOM();
			$('#board').append($board);
			this.game.board.refreshDOM();

			$('#tileRack').append(this.thisPlayer.rack.createDOM('Rack'));
			this.thisPlayer.rack.refreshDOM();

			$('#swapRack').append(this.swapRack.createDOM('Swap', 'SWAP'));
			this.swapRack.refreshDOM();

			const gs = $.i18n('log-game-started');
			$('#logMessages').append(`<p class='gameStart'>${gs}</p>`);

			game.turns.forEach(
				(turn, i) => this.appendTurnToLog(turn, i === game.turns.length - 1));

			if (game.ended)
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

			$('#shuffleButton').button({
				showLabel: false,
				icon: 'shuffle-icon',
				title: $.i18n('button-shuffle'),
				classes: {
					'ui-button-icon': 'crossword-icon'
				}
			})
			.on('click', () => this.shuffleRack());
			
			$('#takeBackButton').button({
				showLabel: false,
				icon: 'take-back-icon',
				title: $.i18n('button-take-back'),
				classes: {
					'ui-button-icon': 'crossword-icon'
				}				
			})
			.on('click', () => this.takeBackTiles());

			$('#turnButton').on('click', () => this.makeMove());

			this.$typingCursor = $('#typingCursor');
			this.$typingCursor.hide(0);

			return Promise.resolve();
		}

		/**
		 * Attach socket communications listeners
		 */
		attachSocketListeners() {

			this.socket = socket_io.connect(null);

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
						playerKey: this.thisPlayer.key
					});
				}
			})

			.on('disconnect', () => {
				console.debug('Socket disconnected');
				$reconnectDialog = $('#problemDialog')
				.text($.i18n('warn-server-disconnected'))
				.dialog({ modal: true });
				const ui = this;
				setTimeout(() => {
					// Try and rejoin after a timeout
					ui.socket.emit('join', {
						gameKey: this.game.key,
						playerKey: this.thisPlayer.key
					});
				}, 1000);

			})

			// Custom events

			.on('connections', info => {
				// Update active connections
				for (let player of this.game.players)
					player.online(false);
				for (let key of info) {
					const player = this.game.getPlayerFromKey(key);
					if (player)
						player.online(true);
				}
			})

			.on('turn', turn => this.processTurn(turn))

			.on('tick', tick => this.processTick(tick))

			.on('gameOverConfirmed', ended =>
				this.processGameOverConfirmed(ended))

			.on('nextGame',	nextGameKey =>
				this.addContinuationGameButton(nextGameKey))

			.on('message', message => this.processMessage(message));
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
						sender: ui.thisPlayer.name,
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
						this.settings[v[0]] = this.settings[v[1]];
					});

			$('#settings')
			.on('click', () => $('#settingsDialog')
				.dialog({ modal: true }));

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
						 }).join(';'));
			});

			if (!this.https) {
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
			const rackSquare = this.thisPlayer.rack.findSquare(letter);
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
				$('#logMessages').append($.i18n('log-letter-not-on-rack', letter));
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
			this.thisPlayer.rack.refreshDOM();
			this.game.board.refreshDOM();
		}

		/**
		 * Promise to prompt for a letter for a blank
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
			if (!this.game.ended && this.game.getLastPlayer().rack.isEmpty()) {
				this.lockBoard(true);
				this.setMoveAction('confirmGameOver');
			} else if (this.placedCount > 0) {
				// Player has dropped some tiles on the board
				// (tileCount > 0), move action is to make the move
				this.setMoveAction('commitMove');
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
					const total = $.i18n('log-total', move.score);
					$('#move').append(`<span class="totalScore">${total}</span>`);
					$('#turnButton').removeAttr('disabled');
				}

				// Use visibility and not display to keep the layout stable
				$('#takeBackButton').css('visibility', 'inherit');
				$('#swapRack').hide();
			} else if (this.swapRack.squaresUsed() > 0) {
				// Swaprack has tiles on it, change the move action
				// to swap
				this.setMoveAction('swap');
				$('#board .ui-droppable').droppable('disable');
				$('#turnButton').removeAttr('disabled');
				$('#takeBackButton').css('visibility', 'inherit');
			} else if (!this.game.ended) {
				// Otherwise turn action is a pass
				this.setMoveAction('pass');
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
			if (typeof turn.deltaScore ==="number")
				player.score += turn.deltaScore;
			else if (typeof turn.deltaScore !== "undefined")
				turn.deltaScore.forEach(
					(d, i) => this.game.players[i].score += d);

			player.refreshDOM();
			$('.lastPlacement').removeClass('lastPlacement');

			switch (turn.type) {
			case 'challenge-won':
			case 'took-back':
				// Move new tiles out of challenged player's rack
				// into the bag
				for (let newTile of turn.newTiles) {
					const tile = player.rack.removeTile(newTile);
					this.game.letterBag.returnTile(tile);
				}

				// Take back the placements from the board into the
				// challenged player's rack
				for (const placement of turn.move.placements) {
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
							$.i18n('notify-title-challenged'),
							$.i18n('notify-body-challenged',
								   this.game.getPlayer(turn.challenger).name,
								   -turn.score));
					}
				}

				if (turn.type == 'took-back') {
					this.notify(
						$.i18n('notify-title-retracted'),
						$.i18n('notify-body-retracted',
							   this.game.getPlayers(turn.challenger).name));
				}
				break;

			case 'challenge-failed':
				if (this.isPlayer(turn.player)) {
					// Our challenge failed
					if (this.settings.warnings)
						this.playAudio('oops');
					this.notify(
						$.i18n('notify-title-you-failed'),
						$.i18n('notify-body-you-failed'));
				} else {
					if (this.settings.warnings)
						this.playAudio('oops');
					this.notify(
						$.i18n('notify-title-they-failed'),
						$.i18n('notify-body-they-failed', player.name));
				}
				break;

			case 'move':
				if (!this.isPlayer(turn.player)) {
					// Put the tiles placed in a turn into place on
					// the board for a player who is not this player (they
					// are already there for this player)
					for (let placement of turn.move.placements) {
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
				for (let newTile of turn.newTiles)
					player.rack.addTile(newTile);

				if (this.isPlayer(turn.player))
					player.rack.refreshDOM();

				break;

			case 'ended-game-over':
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
					this.notify($.i18n('notify-title-your-turn'),
								$.i18n('notify-body-your-turn',
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
				$but.text($.i18n('button-next-game'));
				const $a = $('<a></a>')
					  .addClass('noDecoration')
					  .append($but);
				$a.attr(
					'href',
					`/game/${nextGameKey}/${$.cookie(this.game.key)}`);
				this.log($a);
				$('.anotherGame').remove();
			} else {
				$but.addClass('anotherGame');
				$but.text($.i18n('button-another-game'));
				$but.on('click',
						() => $.post(`/anotherGame/${this.game.key}`));
				this.log($but, 'turnControl');
				this.log($.i18n('log-same-players'));
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
				'button-challenge',
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
				  $(`<button class='moveAction'>${$.i18n('button-take-back')}</button>`);
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
				$('#problemDialog')
				.text($.i18n(move))
				.dialog();
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
			.append($.i18n(`action-${action}`));
		}

		/**
		 * Handler for a click on the 'Make Move' button. This button
		 * may be associated with different actions depending on the
		 * state, through the 'data-action' attribute.
		 * 'commitMove' will send the current tile placements to the server
		 * 'swap' will sawp the tiles currently on the swap rack
		 * 'pass' will pass the current move (set when no tiles are placed)
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
			this.thisPlayer.rack.forEachSquare(square => {
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
			this.thisPlayer.rack.shuffle().refreshDOM();
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
