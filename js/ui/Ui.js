/* eslint-env browser, jquery */

/**
 * User interface to a game in a browser
 */
const deps = [
	"jquery",    // Jquery and components are accessed via $
	"jquery-ui",
//	"touch-punch", // support for touch devices
	"cookie",

	"socket.io",
	"icebox",
	"game/Tile",
	"game/Square",
	"game/Bag",
	"game/Rack",
	"game/Board" ];

define("ui/Ui", deps, (jq, jqui, /*tp,*/ ck, io, Icebox, Tile, Square, Bag, Rack, Board) => {

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
			$('#log').animate({ scrollTop: $('#log').prop('scrollHeight') }, speed);
		}
		
		appendTurnToLog(turn) {
			let player = this.players[turn.player];
			let $scorediv = $("<div class='score'></div>");
			$scorediv.append(`<span class='playerName'>${player.name}'s move</span>`);
			//$scorediv.append(`<span class='score'>${turn.score}</span>`);
			
			let $div = $("<div class='moveScore'></div>");
			$div.append($scorediv);

			let $detail = $("<div class='moveDetail'></div>");
			switch (turn.type) {
			case 'move':
				for (const word of turn.move.words) {
					$detail.append(`<span class='word'>${word.word}</span>`);
					$detail.append(`<span class='score'>(${word.score})</span> `);
				}
				if (turn.move.allTilesBonus) {
					$detail.append(`<span class='word'>All tiles placed bonus</span>`);
					$detail.append(`<span class='score'>50</span>`);
				}
				break;
			case 'timeout':
				$detail.text("Timed out");
				break;			
			case 'pass':
				$detail.text("Passed");
				break;
			case 'swap':
				$detail.text(`Swapped ${turn.count} tile ${turn.count > 1 ? "s" : ""}`);
				break;
			case 'challenge':
				$detail.text("Previous move challenged successfully!");
				break;
			case 'failedChallenge':
				$detail.text("Challenge failed! All words are OK");
				break;
			case 'takeBack':
				$detail.text("Took back previous move");
				break;
			default:
				$detail.text("Unknown move type ${turn.type}");
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
				$('#log')
				.append(`<div class='nextGame'><a href='/game/${nextGameKey}/${$.cookie(this.gameKey)}'>next game</a></div>`);
				$('#makeNextGame').remove();
			} else {
				let $but = $(`<button>Another game</button>`);
				$but.on('click', this.sendMoveToServer('another', null));
				let $ngb = $("<div id='makeNextGame'></div>");
				$ngb.append($but);
				$ngb.append(' if you want another game with the same players');
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
				if (player.tallyScore > 0) {
					$('#log').append(
						`<div class='gameEndScore'>${player.name} gained ${player.tallyScore} points from racks of the other players`);
				} else {
					let letters = "";
					for (const square of player.rack.squares) {
						if (square && square.tile)
							letters += square.tile.letter;
					}
					$('#log').append(`<div class='gameEndScore'>${player.name} lost ${-player.tallyScore} points for a rack containing the letters ${letters}</div>`);
				}
				$(player.scoreElement).text(player.score);
				if (!winners || player.score > winners[0].score) {
					winners = [ player ];
				} else if (player.score == winners[0].score) {
					winners.push(player);
				}
			}
			$("#whosturn").text("Game over");

			let names = [];
			for (let player of winners) {
				if (player == this.thisPlayer) {
					names.push('you');
					if (cheer)
						this.playAudio("applause");
				} else
					name.push(player.name);
			}

			let who;
			if (names.length == 0)
				who = "";
			else if (names.length == 1)
				who = names[0];
			else if (names.length == 2)
				who = `${names[0]} and ${names[1]}`;
			else
				who = names.slice(0, length - 1).join(", ") + ", and " + names[length - 1];

			let verb = (winners.length == 1 && who != "you") ? 'has' : 'have';


			$('#log')
			.append(`<div class='gameEnded'>Game has ended, ${who} ${verb} won</div>`);
			this.displayNextGameMessage(endMessage.nextGameKey);
		}
		
		placeTurnTiles(turn) {
			for (const placement of turn.placements) {
				let square = this.board.squares[placement.col][placement.row];
				square.placeTile(
					new Tile(placement.letter, placement.score), true);
			}
		}
		
		displayWhosTurn(playerNumber) {
			let $wt = $('#whosturn');
			if (playerNumber == this.playerNumber) {
				$wt.text("Your turn");
				$('#turnControls').css('display', 'block');
			} else if (typeof playerNumber == 'number') {
				let name = this.players[playerNumber].name;
				$wt.text(`${name}'${((name.charAt(name.length - 1) == 's') ? '' : 's')} turn`);
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
							'Challenged!',
							`${this.players[turn.challenger].name} has successfully challenged your move. You have lost the ${-turn.score} points you scored and the tiles you had placed are back on your rack`);
					}
				}
				if (turn.type == 'takeBack') {
					this.notify('Move retracted',
								`${this.players[turn.challenger].name} has taken back their move.`);
				}
			}
			if (turn.type == "failedChallenge") {
				if (turn.player == this.playerNumber) {
					this.playAudio("oops");
					this.notify(
						'Failed challenge!',
						`Your challenge failed, you have lost your turn.`);
				} else {
					this.playAudio("oops");
					this.notify(
						'Failed challenge!',
						`${this.players[turn.player].name} challenged your move, but the dictionary backed you up.`);
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
					this.notify('Your turn!', this.players[turn.player].name + ' has made a move and now it is your turn.');
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
			this.keyboardPlacements = [];
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
				tr.append(`<td class='name'>${player.rack ? "You" : player.name}</td>`);
				tr.append("<td class='remainingTiles'></td>");
				tr.append(`<td class='status offline'>${BLACK_CIRCLE}</td>`);
				player.scoreElement = $(`<td class='score'>${player.score}</td>`);
				tr.append(player.scoreElement);
				$tab.append(tr);
			}
			
			this.drawBoard();
			if (this.rack) {
				this.createRackUI(
					this.rack, "Rack");
				this.createRackUI(
					this.swapRack, "Swap");
			}
			
			$('#log').append("<div class='gameStart'>Game started</div>");
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

			let ui = this;
			
			this.socket
			
			.on('connect', data => {
				console.debug('Server: Socket connected');
				if (ui.wasConnected) {
					ui.cancelNotification();
					//window.location = window.location;
				} else {
					ui.wasConnected = true;
					ui.socket.emit('join', { gameKey: ui.gameKey,
											 playerKey: ui.playerKey });
				}
			})
			
			.on('disconnect', data => {
				console.debug('Server: Socket disconnected');
				$('#problem_dialog')
				.text("Server disconnected, trying to reconnect")
				.dialog({ modal: true });
			})
			
			.on('turn', turn => ui.processTurn(turn))
			
			.on('gameEnded', endMessage => {
				console.debug("Received gameEnded");
				ui.displayEndMessage(endMessage, true);
				ui.notify('Game over!', 'Your game is over...');
			})
			
			.on('nextGame', nextGameKey => ui.displayNextGameMessage(nextGameKey))
			.on('message', message => {
				console.debug(`Server: Message ${message.text}`);
				// Chat received
				let $mess = $(`<div><span class='name'>${message.name}</span>: ${message.text}</div>`);
				$('#chatLog')
				.append($mess)
				.animate({ scrollTop: $('#chatLog').prop('scrollHeight') }, 100);
				
				if (message.name != ui.thisPlayer.name) {
					ui.notify(message.name + " says", message.text);
				}
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
			
			$('input[name=message]')
			.bind('change', function() {
				// Send chat
				ui.socket.emit('message',
							   { name: ui.thisPlayer.name,
								 text: $(this).val() });
				$(this).val('');
			});
			$(document)
			.bind('SquareChanged', (e, square) => ui.updateSquare(square))
			.bind('Refresh', () => ui.refresh())
			.bind('RefreshRack', () => ui.refreshRack())
			.bind('RefreshBoard', () => ui.refreshBoard());
		}
		
		displayRemainingTileCounts() {
			let counts = this.remainingTileCounts;
			if (counts.letterBag > 0) {
				$('#letterbagStatus')
				.empty()
				.append(`<div><span id='remainingTileCount'>${counts.letterBag}</span> remaining tiles</div>`);
				$('#scoreboard td.remainingTiles').empty();
			} else {
				$('#letterbagStatus')
				.empty()
				.append("<div>The letterbag is empty</div>");
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
		
		updateSquare(square) {
			if (square.owner == this.rack || square.owner == this.swapRack)
				this.updateRackSquare(square);
			else if (square.owner == this.board)
				this.updateBoardSquare(square);
			else
				throw Error(`could not identify owner of square ${square}`);
		}
		
		updateBoardSquare(square) {
			let ui = this;

			let $div = $(`<div id='${square.id}'></div>`);
			if (square.tile) {
				// There's a tile on the square
				$div.removeClass('Empty');
				$div.addClass('Tile');
				
				if (square.tileLocked) {
					$div.addClass('Locked');
				} else {
					$div.addClass('Temp');
				}
				if (square.tile.isBlank()) {
					$div.addClass('BlankLetter');
				}
				
				if (!square.tileLocked) {
					// tile isn't locked, valid drag source
					$div.on("click", () => {
						if (ui.currentlySelectedSquare) {
							if (ui.currentlySelectedSquare == square) {
								ui.selectSquare(null);
								return;
							}
						}
						ui.selectSquare(square);
					});
					
					let doneOnce = false;
					
					$div.draggable({
						revert: "invalid",
						opacity: 1,
						helper: "clone",
						
						start: (event, jui) => {
							ui.selectSquare(null);
							$(this).css({ opacity: 0.5 });
							$(jui.helper)
							.animate({'font-size' : '120%'}, 300)
							.addClass("dragBorder");
						},
						
						drag: (event, jui) => {
							if (!doneOnce) {
								$(jui.helper).addClass("dragBorder");
								doneOnce = true;
							}
						},
						
						stop: () => {
							$(this).css({ opacity: 1 });
						}
					});
				}
				if (square.tile.letter && square.tile.letter === "_") {
					square.tile.letter = "";
				}
				let $a = $("<a></a>");
				$a.append(`<span class='Letter'>${square.tile.letter ? square.tile.letter : ''}</span>`);
				$a.append(`<span class='Score'>${square.tile.score ? square.tile.score : '0'}</span>`);
				$div.append($a);
			} else { // no tile on the square, valid drop target
				if (!ui.boardLocked()) {
					$div.on("click", () => {
						if (ui.currentlySelectedSquare) {
							ui.moveTile(ui.currentlySelectedSquare, square);
							ui.selectSquare(null);
						}
					})
					.droppable({
						hoverClass: "dropActive",
						drop: function(event, jui) {
							ui.moveTile(ui.idToSquare($(jui.draggable).attr("id")), square);
							ui.playAudio("tiledown");
						}
					});
				}
				
				let text = square.scoreText(ui.board.middle);
				$div.addClass('Empty')
				$div.removeClass('Tile')
				.append($(`<a>${text}</a>`));
			}
			
			$(`#${square.id}`)
			.parent()
			.empty()
			.append($div);
		}
		
		drawBoard() {
			let board = this.board;

			let tab = $("<table></table>");
			for (let y = 0; y < board.dim; y++) {
				let tr = $("<tr></tr>");
				for (let x = 0; x < board.dim; x++) {
					let square = board.squares[x][y];
					let id = `Board_${x}x${y}`;
					square.id = id;
					let td = $(`<td></td>`);
					tr.append(td);
					td.addClass(SQUARE_CLASS[square.type]);
					if (x == board.middle && y == board.middle)
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

		// Update a square in this.rack or this.swapRack
		updateRackSquare(square) {
			let $div = $(`#${square.id}`);
			let $td = $div.parent();
			$div.empty();
			
			let $a = $("<a></a>");
			$div.append($a);
			
			let ui = this;
			// we're creating a bunch of callbacks below that close over the UI object
			
			if (square.tile) {
				$div.removeClass('Empty');
				$div.addClass('Tile');
				if (square.tile.isBlank()) {
					$div.addClass('BlankLetter');
				}
				$div
				.addClass('Temp')
				.click(
					function () {
						if (ui.currentlySelectedSquare) {
							if (ui.currentlySelectedSquare == square) {
								ui.selectSquare(null);
								return;
							}
						}
						ui.selectSquare(square);
					}
				);
				
				let doneOnce = false;
				
				$div.draggable({
					revert: "invalid",
					opacity: 1,
					helper: "clone",
					start: function(event, jui) {
						ui.selectSquare(null);
						$(this).css({ opacity: 0.5 });
						$(jui.helper)
						.animate({'font-size' : '120%'}, 300)
						.addClass("dragBorder");
					},
					
					drag: function(event, jui) {
						if (!doneOnce) {
							$(jui.helper).addClass("dragBorder");
							doneOnce = true;
						}
					},
					stop: function(event, jui) {
						$(this).css({ opacity: 1 });
					}
				});
				
				$a.append(`<span class='Letter'>${square.tile.letter ? square.tile.letter : ''}</span>`);
				$a.append(`<span class='Score'>${square.tile.score ? square.tile.score : ''}</span>`);
			} else {
				$div.removeClass('Tile');
				$div.addClass('Empty');
				
				$div.click(
					() => {
						if (ui.currentlySelectedSquare) {
							ui.moveTile(ui.currentlySelectedSquare, square);
							ui.selectSquare(null);
						}
					}
				);
				
				$div.droppable({
					hoverClass: "dropActive",
					drop: function(event, jui) {
						ui.moveTile(ui.idToSquare($(jui.draggable).attr("id")), square);
					}
				});
			}
		}

		createRackUI(rack, idbase) {
			let $rack = $(`#${idbase}Table tr`);
			let n = 0;
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
				this.updateRackSquare(rack.squares[idx]);
			}
		}
		
		refreshRack() {
			this.rack.squares.forEach(s => this.updateRackSquare(s));
		}
		
		refreshBoard() {
			let board = this.board;
			for (let y = 0; y < board.dim; y++) {
				for (let x = 0; x < board.dim; x++) {
					this.updateBoardSquare(board.squares[x][y]);
				}
			}
		}
		
		refresh() {
			this.refreshRack();
			this.refreshBoard();
		}
		
		selectSquare(square) {
			
			if (this.currentlySelectedSquare) {
				$('#' + this.currentlySelectedSquare.id).removeClass('Selected');
			}
			
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
			let ui = this;

			function setLetter(letter) {
				tile.letter = letter;
				ui.updateSquare(toSquare);
			}

			fromSquare.placeTile(null);
			fromSquare.owner.tileCount--;
			if (tile.isBlank() && !tile.letter || (tile.letter == ' ')) {
				if (fromSquare.owner != this.board && toSquare.owner == this.board) {
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
							setLetter(letter);
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
							
				} else if (toSquare.owner == ui.rack
						   || toSquare.owner == ui.swapRack) {
					tile.letter = ' ';
				}
			}
			toSquare.placeTile(tile);
			toSquare.owner.tileCount++;
			if (!this.boardLocked()) {
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
					$('#move').append(`<div>score: ${move.score}</div>`);
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
					$('#problem_dialog')
					.text(`Move request returned error: ${textStatus} (${errorThrown})`)
					.dialog();
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
					this.updateRackSquare(square);
				}
			}
		}
		
		commitMove() {
			try {
				this.keyboardPlacements = [];
				let move = this.board.analyseMove();
				if (move.error) {
					// fatal - should never get here
					$('#problem_dialog')
					.text(move.error)
					.dialog();
					return;
				}
				this.endMove();
				if (move.tilesPlaced.length == this.board.rackCount) {
					this.playAudio("applause");
				}
				for (let i = 0; i < move.tilesPlaced.length; i++) {
					let tilePlaced = move.tilesPlaced[i];
					let square = this.board.squares[tilePlaced.col][tilePlaced.row];
					square.tileLocked = true;
					this.updateBoardSquare(square);
				}
				this.board.tileCount = 0;
				this.sendMoveToServer('makeMove',
									  move.tilesPlaced,
									  data => this.processMoveResponse(data));
				
				this.enableNotifications();
			}
			catch (e) {
				$('#problem_dialog')
				.text(`error in commitMove: ${e}`)
				.dialog({ modal: true });
			}
		}

		// Add an action button that affects a previous move.
		addLastMoveActionButton(action, label) {
			let ui = this;
			let $button = $(`<div><button class='moveAction'>${label}</button></div>`);
			$button.click(() => this[action]());
			$('#log div.moveScore').last().append($button);
		}
		
		addChallengeButton() {
			this.addLastMoveActionButton('challenge', 'Challenge last move');
		}
		
		addTakeBackMoveButton() {
			this.addLastMoveActionButton('takeBackMove', 'Take back move');
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
					tile.letter = ' ';

				let square = freeRackSquares.pop();
				square.tile = tile;
				ui.rack.tileCount++;
				ui.updateRackSquare(square);
			}
			
			for (let y = 0; y < this.board.dim; y++) {
				for (let x = 0; x < this.board.dim; x++) {
					const boardSquare = this.board.squares[x][y];
					if (boardSquare.tile && !boardSquare.tileLocked) {
						putBackToRack(boardSquare.tile);
						boardSquare.tile = null;
						this.board.tileCount--;
						this.updateBoardSquare(boardSquare);
					}
				}
			}
			
			for (const square of this.swapRack.squares) {
				if (square.tile) {
					putBackToRack(square.tile);
					square.tile = null;
					this.swapRack.tileCount--;
					this.updateRackSquare(square);
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
			let ui = this;
			if (window.webkitNotifications) {
				this.cancelNotification();
				let notification = window.webkitNotifications.createNotification('favicon.ico', title, text);
				this.notification = notification;
				$(notification)
				.on('click', function () {
					this.cancel();
				})
				.on('close', function () {
					delete ui.notification;
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
