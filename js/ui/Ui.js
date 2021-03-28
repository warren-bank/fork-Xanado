/* eslint-env browser, jquery */

/**
 * User interface to a game in a browser
 */
const uideps = [
	"jqueryui",
	"cookie",
	"socket.io",
	"icebox",
	"game/Tile",
	"game/Square",
	"game/Bag",
	"game/Rack",
	"game/Board" ];

define("ui/Ui", uideps, (jq, ck, io, Icebox, Tile, Square, Bag, Rack, Board) => {

	// Class references for icebox
	const ICE_TYPES = { Board: Board, Tile: Tile, Square: Square, Rack: Rack };

	// Unicode characters
	const BLACK_CIRCLE = '\u25cf';

	// Map the characters in the board template to CSS classes
	const SQUARE_CLASS =  {
		Q: "QuadWord",
		q: "QuadLetter",
		T: "TripleWord",
		t: "TripleLetter",
		D: "DoubleWord",
		d: "DoubleLetter",
		_: "Normal"
	};

	class Ui {
		
		constructor() {		
			let splitUrl = document.URL.match(/.*\/([0-9a-f]+)$/);
			if (splitUrl) {
				this.gameKey = splitUrl[1];
				this.playerKey = $.cookie(this.gameKey);
			} else {
				console.log('cannot parse url');
			}

			$.get(`/game/${this.gameKey}`, (d, e) => this.loadGame(d, e));

			$("#shuffleButton").on('click', () => this.shuffle());
			$("#takeBackButton").on('click', () => this.takeBackTiles());
			$("#turnButton").on('click', () => this.makeMove());
		}

		scrollLogToEnd(speed) {
			$('#log').animate({
				scrollTop: $('#log').prop('scrollHeight')
			}, speed);
		}
		
		appendTurnToLog(turn) {
			const player = this.players[turn.player];
			const $scorediv = $("<div class='score'></div>");
			let mess = $.i18n('log-turn', player.name);
			$scorediv.append(`<span class='playerName'>${mess}</span>`);
			
			const $div = $("<div class='moveScore'></div>");
			$div.append($scorediv);

			const $detail = $("<div class='moveDetail'></div>");
			switch (turn.type) {
			case 'move':
				for (const word of turn.move.words)
					$detail.append($.i18n('log-move', word.word, word.score));
				if (turn.move.bonus > 0)
					$detail.append($.i18n('log-bonus', turn.move.bonus));
				break;
			case 'timeout':
				$detail.text($.i18n('log-timeout'));
				break;			
			case 'pass':
				$detail.text($.i18n('log-passed'));
				break;
			case 'swap':
				$detail.text($.i18n('log-swapped', turn.count));
				break;
			case 'challenge':
				$detail.text($.i18n('log-challenge-won'));
				break;
			case 'failedChallenge':
				$detail.text($.i18n('log-challenge-lost'));
				break;
			case 'takeBack':
				$detail.text($.i18n('log-took-back'));
				break;
			default:
				throw Error(`Unknown move type ${turn.type}`);
			}
			$div.append($detail);
			$('#log').append($div);
		}
		
		processMoveScore(turn) {
			let player = this.players[turn.player];
			player.score += turn.score;
			$(player.scoreElement).text(player.score);
		}
		
		displayNextGameMessage(nextGameKey) {
			if (nextGameKey) {
				const $but = ("<button class='nextGame'></button>");
				$but.text($.i18n('button-next-game'));
				const $a = $("<a></a>");
				$a.attr(
					"href", `/game/${nextGameKey}/${$.cookie(this.gameKey)}`);
				$a.append($but);
				$('#log').append($a);
				$('#makeNextGame').remove();
			} else {
				let $but = $(`<button></button>`);
				$but.text($.i18n('button-another-game'));
				$but.on('click', this.sendMoveToServer('anotherGame', null));
				let $ngb = $("<div id='makeNextGame'></div>")
					.append($but).append(" ")
					.append($.i18n('log-same-players'));
				$('#log').append($ngb);
			}
		}
		
		displayEndMessage(endMessage, cheer) {
			let winners;
			for (const i in this.players) {
				let player = this.players[i];
				let endPlayer = endMessage.players[i];
				player.score = endPlayer.score;
				player.tallyScore = endPlayer.tallyScore;
				player.rack = endPlayer.rack;
				const $gsd = $("<div class='gameEndScore'></div>");
				if (player.tallyScore > 0) {
					$gsd.text($.i18n('log-gained-from-racks',
									 player.name, player.tallyScore));
				} else if (player.tallyScore < 0) {
					let letters = "";
					for (const square of player.rack.squares) {
						if (square && square.tile)
							letters += square.tile.letter;
					}
					$gsd.text($.i18n(
						"log-lost-for-rack",
						player.name, -player.tallyScore, letters));
				}
				$('#log').append($gsd);
				$(player.scoreElement).text(player.score);
				if (!winners || player.score > winners[0].score) {
					winners = [ player ];
				} else if (player.score == winners[0].score) {
					winners.push(player);
				}
			}
			$("#whosturn").text($.i18n('log-game-over'));

			let names = [];
			let youWon = false;
			for (let player of winners) {
				if (player == this.thisPlayer) {
					names.push($.i18n('you'));
					if (cheer)
						this.playAudio("endCheer");
					youWon = true;
				} else
					names.push(player.name);
			}

			let who;
			if (names.length == 0)
				who = "";
			else if (names.length == 1)
				who = names[0];
			else if (names.length == 2)
				who = $.i18n('log-name-name', names[0], names[1]);
			else
				who = $.i18n('log-name-name',
					names.slice(0, length - 1).join(", "), names[length - 1]);

			let has = (winners.length == 1 && !youWon) ? 1 : 2;
			let $div = $("<div class='gameEnded'></div>");
			$div.text($.i18n('log-game-ended', who, has));
					  
			$('#log').append($div);
					  
			this.displayNextGameMessage(endMessage.nextGameKey);
		}
		
		placeTurnTiles(turn) {
			for (let placement of turn.placements) {
				let square = this.board.squares[placement.col][placement.row];
				square.placeTile(
					new Tile(placement.letter, placement.score), true);
				let $div = $(`#Board_${placement.col}x${placement.row}`);
				$div.addClass("lastPlacement");
			}
		}
		
		displayWhosTurn(playerNumber) {
			let $wt = $('#whosturn');
			if (playerNumber == this.playerNumber) {
				$wt.text($.i18n('turn-yours'));
				$('#turnControls').css('display', 'block');
			} else if (typeof playerNumber == 'number') {
				$wt.text($.i18n('turn-theirs', this.players[playerNumber].name));
				$('#turnControls').css('display', 'none');
			} else {
				$wt.empty();
				$('#turnControls').css('display', 'none');
			}
		}

		startCountdown(abstime) {
			this.timeOutAt = abstime;
			if (abstime <= 0)
				return;
			console.debug("Starting timer");
			let ui = this;
			$("#timeout").show();
			function tick() {
				let remainSecs = Math.floor((ui.timeOutAt - Date.now()) / 1000);
				$("#timeout").text(remainSecs);
				if (remainSecs > 0)
					setTimeout(tick, 1000);
			}
			setTimeout(tick, 1000);
		}
		
		processTurn(turn) {
			console.debug('Turn ', turn);
			this.appendTurnToLog(turn);
			this.scrollLogToEnd(300);
			this.processMoveScore(turn);
			$(".lastPlacement").removeClass("lastPlacement");
			
			// If this has been a move by another player, place tiles on board
			if (turn.type == 'move' && turn.player != this.playerNumber) {
				this.placeTurnTiles(turn);
			}
			if (turn.type == 'challenge' || turn.type == 'takeBack') {
				let tilesTakenBack = [];
				for (const placement of turn.placements) {
					let square = this.board.squares[placement.col][placement.row];
					if (square.tile.isBlank()) {
						square.tile.letter = ' ';
					}
					tilesTakenBack.unshift(square.tile);
					square.placeTile(null);
				}
				if (turn.player == this.playerNumber) {
					let lettersToReturn = new Bag(turn.returnLetters);
					for (const square of this.rack.squares) {
						if (square.tile && lettersToReturn.contains(square.tile.letter)) {
							lettersToReturn.remove(square.tile.letter);
							square.placeTile(null);
							square.placeTile(tilesTakenBack.pop());
						}
					}
					// Return any tiles to rack that have not been
					// replaced by tiles from the letterBag
					// (i.e. when it run empty)
					for (const square of this.rack.squares) {
						if (!square.tile && tilesTakenBack.length) {
							square.placeTile(tilesTakenBack.pop());
						}
					}
					this.refreshRack();
					if (turn.type == 'challenge') {
						this.playAudio("oops");
						this.notify(
							$.i18n('notify-title-challenged'),
							$.i18n('notify-body-challenged',
								   this.players[turn.challenger].name,
								  -turn.score));
					}
				}
				if (turn.type == 'takeBack') {
					this.notify($.i18n('notify-title-retracted'),
								$.i18n('notify-body-retracted',
									  this.players[turn.challenger].name));
				}
			}
			if (turn.type == "failedChallenge") {
				if (turn.player == this.playerNumber) {
					this.playAudio("oops");
					this.notify(
						$.i18n('notify-title-you-failed'),
						$.i18n('notify-body-you-failed'));
				} else {
					this.playAudio("oops");
					this.notify(
						$.i18n('notify-title-they-failed'),
						$.i18n('notify-body-they-failed',
							   this.players[turn.player].name));
				}
			}
			this.remainingTileCounts = turn.remainingTileCounts;
			if (turn.whosTurn == this.playerNumber) {
				this.playAudio("yourturn");
				if (turn.timeout)
					this.startCountdown(turn.timeout);
			}
			this.boardLocked(turn.whosTurn != this.playerNumber);
            this.removeMoveActionButtons();
			if (typeof turn.whosTurn == 'number' && turn.type != 'challenge') {
				this.displayWhosTurn(turn.whosTurn);
				if (turn.type == 'move' && turn.player == this.playerNumber) {
					this.addTakeBackMoveButton();
				}
				if (turn.whosTurn == this.playerNumber && turn.type != 'takeBack') {
					this.notify($.i18n('notify-title-your-turn'),
								$.i18n('notify-body-your-turn',
									   this.players[turn.player].name));
					if (turn.type == 'move') {
						this.addChallengeButton();
					}
				}
			}
			this.updateGameStatus();
		}
		
		loadGame(data) {
			const gameData = Icebox.thaw(data, ICE_TYPES);
			console.log('gameData', gameData);

			this.board = gameData.board;
			// Number of tiles player has placed on the board
			this.board.tileCount = 0;
			
			// Can swap up to game.swapCount tiles
			this.swapRack = new Rack(this.board.swapCount);
			// Number of tiles currently on the rack
			this.swapRack.tileCount = 0;
			
			this.legalLetters = gameData.legalLetters;
			this.players = gameData.players;
			this.remainingTileCounts  = gameData.remainingTileCounts;
			
			let playerNumber = 0;
			let $tab = $("#playerTable");
			for (let player of gameData.players) {
				if (player.rack) {
					this.rack = player.rack;
					this.playerNumber = playerNumber;
					this.thisPlayer = player;
					this.rack.tileCount = this.rack.squaresUsed();
				}
				playerNumber++;
				
				let tr = $(`<tr class='player${playerNumber - 1}'></tr>`);
				let who = player.rack ? $.i18n('You') : player.name;
				tr.append(`<td class='name'>${who}</td>`);
				tr.append("<td class='remainingTiles'></td>");
				tr.append(`<td class='status offline'>${BLACK_CIRCLE}</td>`);
				player.scoreElement = $(`<td class='score'>${player.score}</td>`);
				tr.append(player.scoreElement);
				$tab.append(tr);
			}
			
			this.drawBoard();
			if (this.rack) {
				this.createRackUI(this.rack, "Rack");
				this.createRackUI(this.swapRack, "Swap");
			}

			const gs = $.i18n('log-game-started');
			$('#log').append(`<p class='gameStart'>${gs}</p>`);
			
			for (let turn of gameData.turns)
				this.appendTurnToLog(turn);
			
			if (gameData.endMessage) {
				this.displayEndMessage(gameData.endMessage, false);
			}
			
			this.scrollLogToEnd(0);
			
			let yourTurn = gameData.whosTurn == this.playerNumber;
			this.displayWhosTurn(gameData.whosTurn);
			this.boardLocked(!yourTurn);
			
			this.updateGameStatus();
			
			let lastTurn = gameData.turns.length && gameData.turns[gameData.turns.length - 1];
			
			if (lastTurn && lastTurn.type == 'move') {
				if (yourTurn) {
					this.addChallengeButton();
				} else if (lastTurn.player == this.playerNumber) {
					this.addTakeBackMoveButton();
				}
			}
			
			let transports = ['websocket', 'flashsocket', 'htmlfile', 'xhr-multipart', 'xhr-polling', 'jsonp-polling'];
			if (navigator.userAgent.search("Firefox") >= 0) {
				transports = ['htmlfile', 'xhr-polling', 'jsonp-polling'];
			}
			
			this.socket = io.connect(null, { transports: transports });

			let $reconnectDialog = null;
			
			this.socket
			
			.on('connect', () => {
				if ($reconnectDialog) {
					$reconnectDialog.dialog("close");
					$reconnectDialog = null;
				}
				console.debug('Server: Socket connected');
				if (this.wasConnected) {
					this.cancelNotification();
					//window.location = window.location;
				} else {
					this.wasConnected = true;
					this.socket.emit('join', { gameKey: this.gameKey,
											 playerKey: this.playerKey });
				}
			})
			
			.on('disconnect', () => {
				console.debug('Server: Socket disconnected');
				$reconnectDialog = $('#problemDialog')
				.text($.i18n('msg-server-disconnected'))
				.dialog({ modal: true });
				let ui = this;
				setTimeout(() => {
					ui.socket.emit('join', { gameKey: ui.gameKey,
											 playerKey: ui.playerKey });
				}, 1000);
				
			})
			
			.on('turn', turn => this.processTurn(turn))
			
			.on('gameEnded', endMessage => {
				console.debug("Received gameEnded");
				this.displayEndMessage(endMessage, true);
				this.notify($.i18n('notify-title-game-over'),
							$.i18n('notify-body-game-over'));
			})
			
			.on('nextGame', nextGameKey =>
				this.displayNextGameMessage(nextGameKey))
			.on('message', message => {
				console.debug(`Server: Message ${message.text}`);
				// Chat received
				let $mess = $(`<div><span class='name'>${message.name}</span>: ${message.text}</div>`);
				$('#chatLog')
				.append($mess)
				.animate({ scrollTop: $('#chatLog').prop('scrollHeight') }, 100);
				
				if (message.name != this.thisPlayer.name)
					this.notify(message.name, message.text);
			})
			
			.on('join', info => {
				console.debug("Server: Player ", info, " joining");
				if (info.timeout)
					this.startCountdown(info.timeout);

				// Server has confirmed game has been joined
				$(`tr.player${info.playerNumber} td.status`)
				.removeClass('offline')
				.addClass('online');
			})
			
			.on('leave', playerNumber => {
				// Server has indicated game has been left
				// AFAICT this
				console.debug(`Server: Player ${playerNumber} leaving`);
				$(`tr.player ${playerNumber} td.status`)
				.removeClass('online')
				.addClass('offline');
			});

			let ui = this;
			$('input[name=message]')
			.bind('change', function() {
				// Send chat
				ui.socket.emit(
					'message',
					{ name: ui.thisPlayer.name, text: $(this).val() });
				$(this).val('');
			});
			
			$(document)
			.bind('SquareChanged', (e, square) => this.updateSquare(square))
			.bind('Refresh', () => this.refresh())
			.bind('RefreshRack', () => this.refreshRack())
			.bind('RefreshBoard', () => this.refreshBoard());
		}
		
		displayRemainingTileCounts() {
			let counts = this.remainingTileCounts;
			if (counts.letterBag > 0) {
				const mess = $.i18n('letterbag-remaining', counts.letterBag);
				$('#letterbagStatus')
				.empty()
				.append(`<div>${mess}</div>`);
				$('#scoreboard td.remainingTiles').empty();
			} else {
				$('#letterbagStatus')
				.empty()
				.append($.i18n('letterbag-empty'));
				let countElements = $('#scoreboard td.remainingTiles');
				for (let i = 0; i < counts.players.length; i++) {
					let count = counts.players[i];
					$(countElements[i])
					.empty()
					.append('(' + count + ')');
				}
			}
			if (counts.letterBag < this.board.rackCount)
				$('#swapRack').hide();
			else
				$('#swapRack').show();
		}

		/**
		 * Map from a DOM element id back to a Square on one
		 * of the board, the rack, or the swapRack
		 */
		idToSquare(id) {
			let match = id.match(/^(Board|SwapRack|Rack)_(\d+)(?:x(\d+))?$/);
			if (match) {
				if (match[1] == 'Board') {
					return this.board.squares[match[2]][match[3]];
				} else if (match[1] == 'SwapRack')	{
					return this.swapRack.squares[match[2]];
				} else {
					return this.rack.squares[match[2]];
				}
			} else
				throw Error(`cannot parse #${id}`);
		}

		// A square is a space for a tile on a rack or on the board
		updateSquare(square) {
			let $div = $(`#${square.id}`)
				.removeClass("Selected")
				.removeClass("Temp")
				.off("click");
			
			if (square.tile)
				this.updateOccupiedSquare(square, $div);
			else
				this.updateEmptySquare(square, $div);

		}

		updateOccupiedSquare(square, $div) {

			if ($div.hasClass("ui-droppable"))
				$div.droppable("destroy");

			$div
			.removeClass("Empty")
			.addClass("Tile");
				
			if (square.tile.isBlank())
				$div.addClass('BlankLetter');
				
			if (square.owner == this.board && square.tileLocked) {
				$div.addClass('Locked');
				if ($div.hasClass("ui-draggable"))
					$div.draggable("destroy");
			} else {
				// tile isn't locked, valid drag source
				$div
				.addClass('Temp')
				.on("click", () => {
					if (this.currentlySelectedSquare) {
						if (this.currentlySelectedSquare == square) {
							this.selectSquare(null);
							return;
						}
					}
					this.selectSquare(square);
				});
					
				$div.draggable({
					revert: "invalid",
					opacity: 1,
					helper: "clone",
					
					start: (event, jui) => {
						$div.css({ opacity: 0.5 });
						this.selectSquare(null);
						$(jui.helper)
						.animate({'font-size' : '120%'}, 300)
						.addClass("dragBorder");
					},
					
					drag: (event, jui) => $(jui.helper).addClass("dragBorder"),
					
					stop: () => $div.css({ opacity: 1 })
				});
			}

			let letter = square.tile.letter ? square.tile.letter : '';
			let score = square.tile.score ? square.tile.score : '0';
			
			let $a = $("<a></a>");
			$a.append(`<span class='Letter'>${letter}</span>`);
			$a.append(`<span class='Score'>${score}</span>`);
			$div.html($a);
		}

		updateEmptySquare(square, $div) {
			
			// Not draggable
			if ($div.hasClass("ui-draggable"))
				$div.draggable("destroy");

			// no tile on the square, valid drop target
			$div
			.removeClass("Tile")
			.addClass("Empty");
						
			if (square.owner == this.board && this.boardLocked()) {
				if ($div.hasClass("ui-droppable"))
					$div.droppable("destroy");
			}
			else {
				$div.on("click", () => {
					if (this.currentlySelectedSquare) {
						this.moveTile(this.currentlySelectedSquare, square);
						this.selectSquare(null);
					}
				})

				.droppable({
					hoverClass: "dropActive",
					drop: (event, jui) => {
						this.moveTile(this.idToSquare(
							$(jui.draggable).attr("id")), square);
						this.playAudio("tiledown");
					}
				});
			}

			let text = (square.owner == this.board)
				? square.scoreText(this.board.middle) : "";

			$div.addClass('Empty')
			.removeClass('Tile')
			.html(`<a>${text}</a>`);
		}
		
		drawBoard() {
			let board = this.board;

			let tab = $("<table></table>");
			for (let row = 0; row < board.dim; row++) {
				let tr = $("<tr></tr>");
				for (let col = 0; col < board.dim; col++) {
					let square = board.squares[col][row];
					let id = `Board_${col}x${row}`;
					square.id = id;
					let td = $(`<td></td>`);
					tr.append(td);
					td.addClass(SQUARE_CLASS[square.type]);
					if (col == board.middle && row == board.middle)
						td.addClass('StartField');
					else if (square.type != '_')
						td.addClass('SpecialField');
					let $div = $(`<div id='${id}'><a></a></div>`);
					td.append($div);
				}
				tab.append(tr);
			}
			$('#board').append(tab);
			
			this.refreshBoard();
		}

		createRackUI(rack, idbase) {
			let $rack = $(`#${idbase}Table tr`);
			for (let idx = 0; idx < rack.squares.length; idx++) {
				const id = `${idbase}_${idx}`;
				let $td = $(`<td class="Normal"><div id="${id}"><a></a></div></td>`);
				if (idbase == "Swap") {
					const letter = idbase.toUpperCase().charAt(idx);
					$td.addClass("bgLetterContainer");
					$td.append(`<div class="bgLetter">${letter}</div>`);
				}
				$rack.append($td);
				rack.squares[idx].id = id;
				this.updateSquare(rack.squares[idx]);
			}
		}
		
		refreshRack() {
			this.rack.squares.forEach(s => this.updateSquare(s));
		}
		
		refreshBoard() {
			let board = this.board;
			for (let col = 0; col < board.dim; col++) {
				for (let row = 0; row < board.dim; row++)
					this.updateSquare(board.squares[col][row]);
			}
		}
		
		refresh() {
			this.refreshRack();
			this.refreshBoard();
		}

		// Square selection is used for click-click moves when dragging
		// isn't available
		selectSquare(square) {
			
			if (this.currentlySelectedSquare)
				$('#' + this.currentlySelectedSquare.id).removeClass('Selected');
			
			this.currentlySelectedSquare = square;
			
			if (this.currentlySelectedSquare) {
				$('#' + this.currentlySelectedSquare.id).addClass('Selected');
			}
			
			$('#board td').removeClass('Targeted');
			
			// selecting the target first does not yet work.
			if (square && !square.tile) {
				console.debug(`SelectSquare - ${square.col},${square.row}`);
				$(`#Board_${square.col}x${square.row}`)
				.addClass('Targeted');
			}
		}
		
		moveTile(fromSquare, toSquare) {
			let tile = fromSquare.tile;

			fromSquare.placeTile(null);
			fromSquare.owner.tileCount--;
			if (tile.isBlank()) {			
				if (fromSquare.owner != this.board
					&& toSquare.owner == this.board) {
					
					let $dlg = $('#blankDialog');
					let $tab = $("#blankLetterTable");
					$tab.empty();
					let ll = this.legalLetters.split("");
					let dim = Math.ceil(Math.sqrt(ll.length));
					let rowlength = dim;
					let $row = null;
					while (ll.length > 0) {
						let letter = ll.shift();
						if (rowlength == dim) {
							if ($row)
								$tab.append($row);
							$row = $("<tr></tr>");
							rowlength = 0;
						}
						let $td = $(`<td>${letter}</td>`);
						$td.on('click', () => {
							tile.letter = letter;
							this.updateSquare(toSquare);
							$dlg.dialog("close");
						});
						$row.append($td);
						rowlength++;
					}
					if ($row)
						$tab.append($row);
				
					$dlg.dialog({
						modal: true,
						closeOnEscape: false,
						closeText: "hide"
					});
							
				} else if (toSquare.owner == this.rack
						   || toSquare.owner == this.swapRack) {
					tile.letter = ' ';
					this.updateSquare(toSquare);
				}
			}
			toSquare.placeTile(tile);
			toSquare.owner.tileCount++;
			if (!this.boardLocked()) {
				const ui = this;
				window.setTimeout(() => ui.updateGameStatus(), 500);
			}
		}
		
		updateGameStatus() {
			$('#move').empty();
			this.displayRemainingTileCounts();
			if (this.board.tileCount > 0) {
				// Player has dropped some tiles on the board
				// (tileCount > 0), move action is to make the move
				this.setMoveAction('commitMove', 'Make move');
				let move = this.board.analyseMove();
				if (move.error) {
					$('#move').append(move.error);
					$('#turnButton').attr('disabled', 'disabled');
				} else {
					const bonus = this.board.calculateBonus(
						move.tilesPlaced.length);
					const $score = $(`<div>score: ${move.score}</div>`);
					if (bonus > 0)
						$score.append(` + bonus ${bonus}`);
					$('#move').append($score);
					for (const word of move.words)
						$('#move').append(`<div>${word.word} ${word.score}</div>`);
					$('#turnButton').removeAttr('disabled');
				}
				$('#takeBackButton').css('visibility', 'inherit');
				$('#swapRack').hide();
			} else if (this.swapRack.tileCount > 0) {
				// Swaprack has tiles on it, change the move action
				// to swap
				this.setMoveAction('swapTiles', 'Swap tiles');
				$('#board .ui-droppable').droppable('disable');
				$('#turnButton').removeAttr('disabled');
				$('#takeBackButton').css('visibility', 'inherit');
			} else {
				// Otherwise turn action is a pass
				this.setMoveAction('pass', 'Pass');
				$('#board .ui-droppable').droppable('enable');
				$('#turnButton').removeAttr('disabled');
				$('#takeBackButton').css('visibility', 'hidden');
			}
		}
		
		playAudio(id) {
			let audio = document.getElementById(id);
			
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
					audio.removeEventListener("canplay", currentTime, true);
					audio.play();
				};
				audio.addEventListener("canplay", currentTime, true);
			}
		}
		
		sendMoveToServer(command, args, success) {
			this.cancelNotification();
			$.ajax({
				type: 'POST',
				url: '/game/' + this.gameKey,
				contentType: 'application/json',
				data: JSON.stringify({ command: command,
									   arguments: args }),
				success: success,
				error: function(jqXHR, textStatus, errorThrown) {
					console.error(`Move request returned error: ${textStatus} (${errorThrown})`);
				}
			});
		}
		
		boardLocked(newVal) {
			if (arguments.length > 0) {
				if (newVal) {
					$('#turnButton').attr('disabled', 'disabled');
				} else {
					$('#turnButton').removeAttr('disabled');
				}
				this.board.locked = newVal;
				this.refreshBoard();
			}
			return this.board.locked;
		}
		
		endMove() {
			this.removeMoveActionButtons();
			$('#move').empty();
			this.boardLocked(true);
		}
		
		processMoveResponse(data) {
			console.debug('move response:', data);
			data = Icebox.thaw(data, ICE_TYPES);
			if (!data.newRack)
				throw Error('expected new rack, got ' + data);

			for (const square of this.rack.squares) {
				if (data.newRack.length && !square.tile) {
					square.placeTile(data.newRack.pop());
					this.rack.tileCount++;
					this.updateSquare(square);
				}
			}
		}
		
		commitMove() {
			let move = this.board.analyseMove();
			if (move.error) {
				// fatal - should never get here
				$('#problemDialog')
				.text(move.error)
				.dialog();
				return;
			}
			move.bonus = this.board.calculateBonus(move.tilesPlayed);
			move.score += move.bonus;
			this.endMove();
			if (move.bonus > 0)
				this.playAudio("bonusCheer");

			for (let i = 0; i < move.tilesPlaced.length; i++) {
				let tilePlaced = move.tilesPlaced[i];
				let square = this.board.squares[tilePlaced.col][tilePlaced.row];
				square.tileLocked = true;
				this.updateSquare(square);
			}
			this.board.tileCount = 0;
			this.sendMoveToServer('makeMove',
								  move.tilesPlaced,
								  data => this.processMoveResponse(data));
			
			this.enableNotifications();
		}

		// Add an action button that affects a previous move.
		addLastMoveActionButton(action, label) {
			let $button = $(`<div><button class='moveAction'>${label}</button></div>`);
			$button.click(() => this[action]());
			$('#log div.moveScore').last().append($button);
		}
		
		addChallengeButton() {
			this.addLastMoveActionButton('challenge', $.i18n('button-challenge'));
		}
		
		addTakeBackMoveButton() {
			this.addLastMoveActionButton(
				'takeBackMove', $.i18n('button-take-back'));
		}
		
		removeMoveActionButtons() {
			$('button.moveAction').remove();
		}

		// Action on button clicked
		challenge() {
			this.takeBackTiles();
			this.endMove();
			this.sendMoveToServer('challenge');
		}
		
		// Action on button clicked
		takeBackMove() {
			this.takeBackTiles();
			this.endMove();
			this.sendMoveToServer('takeBack');
		}
		
		pass() {
			this.takeBackTiles();
			this.endMove();
			this.sendMoveToServer('pass')
		}
		
		swapTiles() {
			this.endMove();
			let letters = this.swapRack.letters();
			for (const square of this.swapRack.squares) {
				square.placeTile(null);
				this.swapRack.tileCount--;
			}
			this.sendMoveToServer(
				'swap',
				letters,
				data => this.processMoveResponse(data));
		}
		
		setMoveAction(action, title) {
			$('#turnButton')
			.attr('action', action)
			.empty()
			.append(title);
		}
		
		makeMove() {
			let action = $('#turnButton').attr('action');
			console.debug('makeMove =>', action);
			this[action]();
		}
		
		takeBackTiles() {
			const freeRackSquares = [];
			for (const square of this.rack.squares)
				if (!square.tile)
					freeRackSquares.push(square);

			const ui = this;
			
			function putBackToRack(tile) {
				if (tile.isBlank())
					tile.letter = '';

				let square = freeRackSquares.pop();
				square.tile = tile;
				ui.rack.tileCount++;
				ui.updateSquare(square);
			}
			
			for (let y = 0; y < this.board.dim; y++) {
				for (let x = 0; x < this.board.dim; x++) {
					const boardSquare = this.board.squares[x][y];
					if (boardSquare.tile && !boardSquare.tileLocked) {
						putBackToRack(boardSquare.tile);
						boardSquare.tile = null;
						this.board.tileCount--;
						this.updateSquare(boardSquare);
					}
				}
			}
			
			for (const square of this.swapRack.squares) {
				if (square.tile) {
					putBackToRack(square.tile);
					square.tile = null;
					this.swapRack.tileCount--;
					this.updateSquare(square);
				}
			}
			this.updateGameStatus();
		}
		
		shuffle() {
			function random(i) {
				return Math.floor(Math.random() * i);
			}
			for (let i = 0; i < 16; i++) {
				let from = this.rack.squares[random(this.rack.squares.length)];
				let to = this.rack.squares[random(this.rack.squares.length)];
				let tmp = from.tile;
				from.tile = to.tile;
				to.tile = tmp;
			}
			this.refreshRack();
		}
		
		enableNotifications() {
			// must be called in response to user action
			if (window.webkitNotifications) {
				console.debug('notification permission:', window.webkitNotifications.checkPermission());
				if (window.webkitNotifications.checkPermission() != 0) {
					console.debug('requesting notification permission');
					window.webkitNotifications.requestPermission();
				}
			}
		}
		
		notify(title, text) {
			// TODO: either use HTML5 Notification API, or
			// provide this feedback some other way
			if (window.webkitNotifications) {
				this.cancelNotification();
				let notification = window.webkitNotifications
					.createNotification('favicon.ico', title, text);
				this.notification = notification;
				$(notification)
				.on('click', function () {
					this.cancel();
				})
				.on('close', () => {
					delete this.notification;
				});
				notification.show();
			}
		}
		
		cancelNotification() {
			if (this.notification) {
				this.notification.cancel();
				delete this.notification;
			}
		}
	}
	
	return Ui;
});
