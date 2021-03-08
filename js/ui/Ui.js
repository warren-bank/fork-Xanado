/* eslint-env browser, jquery */

/**
 * User interface to a game in a browser
 */
const deps = [
	"jquery",    // Jquery and components are accessed via $
	"jquery-ui",
	"blockUI",
	"cookie",

	"underscore",
	"socket.io",
	"icebox",
	"scrabble/Tile",
	"scrabble/Square",
	"scrabble/Bag",
	"scrabble/Rack",
	"scrabble/Board" ];

define("ui/Ui", deps, (ijq, ijqui, ibui, icookie, _, io, icebox, Tile, Square, Bag, Rack, Board) => {

	// Class references for icebox
	const ICE_TYPES = { Board: Board, Tile: Tile, Square: Square, Rack: Rack };
	const STAR = '\u2605';

	class Ui {
		
		constructor() {
			
			let splitUrl = document.URL.match(/.*\/([0-9a-f]+)$/);
			if (splitUrl) {
				this.gameKey = splitUrl[1];
				this.playerKey = $.cookie(this.gameKey);
			} else {
				console.log('cannot parse url');
			}

			const ui = this;
			
			$.get(`/game/${this.gameKey}`, (d, e) => ui.loadGame(d, e));

			let $button = $("<button id='turnButton' action='pass'>Pass</button>");
			$button.bind('click', () => ui.makeMove());
			$('#turnButtons')
			.append($button)
			.append("<button id='dummyInput' />");
			

			$('#dummyInput')
			.on('keypress', event => {
				let letter = String.fromCharCode(event.charCode).toUpperCase();
				if (ui.cursor && ui.legalLetters.indexOf(letter) != -1) {
					let rackSquare = ui.rack.findLetterSquare(letter, true);
					if (rackSquare) {
						if (rackSquare.tile.isBlank()) {
							rackSquare.tile.letter = letter;
						}
						ui.keyboardPlacements.push([rackSquare, ui.cursor.square, ui.cursor.direction]);
						ui.moveTile(rackSquare, ui.cursor.square);
						let newCursorSquare;
						if (ui.cursor.direction == 'horizontal') {
							for (let x = ui.cursor.square.x; x < 15; x++) {
								let boardSquare = ui.board.squares[x][ui.cursor.square.y];
								if (!boardSquare.tile) {
									newCursorSquare = boardSquare;
									break;
								}
							}
						} else {
							for (let y = ui.cursor.square.y; y < 15; y++) {
								let boardSquare = ui.board.squares[ui.cursor.square.x][y];
								if (!boardSquare.tile) {
									newCursorSquare = boardSquare;
									break;
								}
							}
						}
						if (newCursorSquare) {
							ui.setCursor(newCursorSquare);
						} else {
							ui.deleteCursor();
						}
					}
				}
			})
			.on('keydown', event => {
				switch (event.keyCode) {
				case $.ui.keyCode.UP:
					ui.move(0, -1);
					break;
				case $.ui.keyCode.DOWN:
					ui.move(0, 1);
					break;
				case $.ui.keyCode.LEFT:
					ui.move(-1, 0);
					break;
				case $.ui.keyCode.RIGHT:
					ui.move(1, 0);
					break;
				case $.ui.keyCode.SPACE:
					ui.turnCursor();
					break;
				case $.ui.keyCode.BACKSPACE:
				case $.ui.keyCode.DELETE:
					ui.deleteLast();
					break;
				case $.ui.keyCode.TAB:
					break;
				default:
					return false;
				}
				event.stopPropagation();
				event.preventDefault();
				return true;
			});
		}

		deleteLast() {
			if (this.keyboardPlacements.length) {
				let lastPlacement = this.keyboardPlacements.pop();
				let rackSquare = lastPlacement[0];
				let boardSquare = lastPlacement[1];
				let cursorDirection = lastPlacement[2];
				if (!rackSquare.tile && boardSquare.tile) {
					this.moveTile(boardSquare, rackSquare);
					this.setCursor(boardSquare, cursorDirection);
				} else {
					this.keyboardPlacements = []; // user has moved stuff around, forget keyboard entry
				}
			}
		}
		
		move(dx, dy) {
			if (!this.cursor)
				return;
			let x = this.cursor.square.x;
			let y = this.cursor.square.y;
			if (dx > 0) {
				for (x++; x < 15 && this.board.squares[x][y].tile; x++);
			}
			if (dx < 0) {
				for (x--; x >= 0 && this.board.squares[x][y].tile; x--);
			}
			if (dy > 0) {
				for (y++; y < 15 && this.board.squares[x][y].tile; y++);
			}
			if (dy < 0) {
				for (y--; y >= 0 && this.board.squares[x][y].tile; y--);
			}
			if (x >= 0 && x < 15
				&& y >= 0 && y < 15
				&& (x != this.cursor.square.x || y != this.cursor.square.y)) {
				let oldCursorSquare = this.cursor.square;
				this.cursor.square = this.board.squares[x][y];
				this.updateBoardSquare(oldCursorSquare);
				this.updateBoardSquare(this.cursor.square);
			}
		}

		turnCursor() {
			if (this.cursor) {
				this.cursor.direction =
				(this.cursor.direction == 'horizontal') ? 'vertical' : 'horizontal';
				this.updateBoardSquare(this.cursor.square);
			}
		}
		
		scrollLogToEnd(speed) {
			$('#log').animate({ scrollTop: $('#log').prop('scrollHeight') }, speed);
		}
		
		appendTurnToLog(turn) {
			let player = this.players[turn.player];
			let scorediv = $("<div class='score'></div>");
			scorediv.append(`<span class='playerName'>${player.name}</span>`);
			scorediv.append(`<span class='score'>${turn.score}</span>`);
			
			let div = $("<div class='moveScore'></div>");
			div.append(scorediv);
			
			switch (turn.type) {
			case 'move':
				for (const word of turn.move.words) {
					let wordscore = $("<div class='moveDetail'></div>");
					wordscore.append(`<span class='word'>${word.word}</span<`);
					wordscore.append(`<span class='score'>${word.score}</span>`);
					div.append(wordscore);
				}
				if (turn.move.allTilesBonus) {
					let bonus = $("<div class='moveDetail'></div>");
					bonus.append(`<span class='word'>All tiles placed bonus</span<`);
					bonus.append(`<span class='score'>50</span>`);
					div.append(bonus);
				}
				break;
			case 'pass':
				div.append("<div class='moveDetail'>Passed</div>");
				break;
			case 'swap':
				div.append(`<div class='moveDetail'>Swapped ${turn.count} tile ${turn.count > 1 ? "s" : ""}</div>`);
				break;
			case 'challenge':
				div.append("<div class='moveDetail'>Challenged previous move</div>");
				break;
			case 'takeBack':
				div.append("<div class='moveDetail'>Took back previous move</div>");
				break;
			default:
				div.append(`<div class='moveDetail'>Unknown move ${turn.type}</div>`);
			}
			$('#log').append(div);
		}
		
		processMoveScore(turn) {
			let player = this.players[turn.player];
			player.score += turn.score;
			$(player.scoreElement).text(player.score);
		}
		
		displayNextGameMessage(nextGameKey) {
			if (nextGameKey) {
				$('#log')
				.append(`<div class='nextGame'><a href='/game/${nextGameKey}/${$.cookie(this.gameKey)}>next game</a></div>`);
				$('#makeNextGame').remove();
			} else {
				let makeNextGameButton = $("<button>Make new game</button>");
				const ui = this;
				$(makeNextGameButton)
				.on('click', function() {
					ui.sendMoveToServer('newGame', null);
				});
				let $ngb = $("<div id='makeNextGame'>Click </div>");
				$ngb.append(makeNextGameButton);
				$ngb.append(' if you want to play the same opponents again');
				$('#log').append($ngb);
			}
		}
		
		displayEndMessage(endMessage) {
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
			$('#whosturn').empty();
			
			let youHaveWon = (winners.indexOf(this.thisPlayer) >= 0);
			let names = [];
			for (const player of winners)
				names.push(this.thisPlayer ? 'you' : player.name);

			let who;
			if (names.length == 0)
				who = "";
			else if (names.length == 1)
				who = names[0];
			else
				who = _.reduce(names.slice(1, length - 1),
							  (accu, word) => `${accu}, ${word}`,
							  names[0]) + ` and ${names[length - 1]}`;

			let verb = (winners.length == 1 && !youHaveWon) ? 'has' : 'have';
			$('#log')
			.append(`<div class='gameEnded'>Game has ended, ${who} ${verb} won</div>`);
			this.displayNextGameMessage(endMessage.nextGameKey);
		}
		
		placeTurnTiles(turn) {
			for (const placement of turn.placements) {
				this.board.squares[placement.x][placement.y]
				.placeTile(new Tile(placement.letter, placement.score), true);
			}
		}
		
		displayWhosTurn(playerNumber) {
			if (playerNumber == this.playerNumber) {
				$('#whosturn').empty().text("Your turn");
				$('#turnControls').css('display', 'block');
			} else if (typeof playerNumber == 'number') {
				let name = this.players[playerNumber].name;
				$('#whosturn').empty().text(`${name}'${((name.charAt(name.length - 1) == 's') ? '' : 's')} turn`);
				$('#turnControls').css('display', 'none');
			} else {
				$('#whosturn').empty();
				$('#turnControls').css('display', 'none');
			}
		}

		processTurn(turn) {
			console.log('turn', turn);
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
					let square = this.board.squares[placement.x][placement.y];
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
						this.notify(
							'Challenged!',
							`${this.players[turn.challenger].name} has challenged your move. You have lost the ${-turn.score} points you scored and the tiles you had placed are back on your rack`);
					}
				}
				if (turn.type == 'takeBack') {
					this.notify('Move retracted',
								`${this.players[turn.challenger].name} has taken back their move.`);
				}
			}
			this.remainingTileCounts = turn.remainingTileCounts;
			if (turn.whosTurn == this.playerNumber) {
				this.playAudio("yourturn");
			}
			this.boardLocked(turn.whosTurn != this.playerNumber);
            this.removeMoveEditButtons();
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
			const gameData = icebox.thaw(data, ICE_TYPES);
			console.log('gameData', gameData);
			
			this.swapRack = new Rack(7);
			this.swapRack.tileCount = 0;
			this.board = gameData.board;
			this.board.tileCount = 0;
			this.legalLetters = gameData.legalLetters;
			this.players = gameData.players;
			this.keyboardPlacements = [];
			this.remainingTileCounts  = gameData.remainingTileCounts;
			
			let playerNumber = 0;
			let tab = $("<table></table>");
			for (let player of gameData.players) {
				if (player.rack) {
					this.rack = player.rack;
					this.playerNumber = playerNumber;
					this.thisPlayer = player;
					this.rack.tileCount = _.reduce(
						player.rack.squares,
						(accu, square) => {
							if (square.tile) {
								accu++;
							}
							return accu;
						},
						0);
				}
				playerNumber++;
				
				let tr = $(`<tr class='player${playerNumber - 1}'></tr>`);
				tr.append(`<td class='name'>${player.rack ? "You" : player.name}</td>`);
				tr.append("<td class='remainingTiles'></td>");
				tr.append("<td class='status offline'>\u25cf</td>");
				player.scoreElement = $(`<td class='score'>${player.score}</td>`);
				tr.append(player.scoreElement);
				tab.append(tr);
			}
			
			$('#scoreboard')
			.append(tab)
			.append("<div id='letterbagStatus'></div>");
			
			this.drawBoard();
			if (this.rack) {
				this.drawRack();
				this.drawSwapRack();
			}			
			
			$('#log').append("<div class='gameStart'>Game started</div>");
			for (let turn of gameData.turns)
				this.appendTurnToLog(turn);
			
			if (gameData.endMessage)
				this.displayEndMessage(gameData.endMessage);
			
			this.scrollLogToEnd(0);
			
			let yourTurn = gameData.whosTurn == this.playerNumber;
			this.displayWhosTurn(gameData.whosTurn);
			this.boardLocked(!yourTurn);
			
			this.updateGameStatus();
			
			let lastTurn = gameData.turns.length && gameData.turns[gameData.turns.length - 1];
			
			if (lastTurn && (lastTurn.type == 'move')) {
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
				console.log('socket connected');
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
				console.log('socket disconnect');
				$.blockUI({ message: '<h1>Server unavailable, please wait</h1>' });
			})
			.on('turn', turn => ui.processTurn(turn))
			.on('gameEnded', endMessage => {
				endMessage = icebox.thaw(endMessage, ICE_TYPES);
				ui.displayEndMessage(endMessage);
				ui.notify('Game over!', 'Your game is over...');
			})
			.on('nextGame', nextGameKey => ui.displayNextGameMessage(nextGameKey))
			.on('message', message => {
				// Chat received
				let $mess = $(`<div><span class='name'>${message.name}</span>: ${message.text}</div>`);
				$('#chatLog')
				.append($mess)
				.animate({ scrollTop: $('#chatLog').prop('scrollHeight') }, 100);
				
				if (message.name != ui.thisPlayer.name) {
					ui.notify(message.name + " says", message.text);
				}
			})
			.on('join', playerNumber => {
				// Server has confirmed game has been joined
				$(`tr.player${playerNumber} td.status`)
				.removeClass('offline')
				.addClass('online');
			})
			.on('leave', playerNumber => {
				// Server has indicated game has been left
				// AFAICT this
				$(`tr.player ${playerNumber} td.status`)
				.removeClass('online')
				.addClass('offline');
			});
			
			$('input[name=message]')
			.bind('focus', () => ui.clearCursor())
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
			if (counts.letterBag < 7) {
				$('#swapRack').hide();
			} else {
				$('#swapRack').show();
			}
		}
		
		idToSquare(id) {
			let match = id.match(/(Board|Rack)_(\d+)x?(\d*)/);
			if (match) {
				if (match[1] == 'Board') {
					return this.board.squares[match[2]][match[3]];
				} else {
					return this.rack.squares[match[2]];
				}
			} else {
				throw "cannot parse id " + id;
			}
		}
		
		updateSquare(square) {
			if (square.owner == this.rack
				|| square.owner == this.swapRack) {
				this.updateRackSquare(square);
			} else if (square.owner == this.board) {
				this.updateBoardSquare(square);
			} else {
				console.log('could not identify owner of square', square);
			}
		}
		
		clearCursor() {
			let cursor = this.cursor;
			if (cursor) {
				delete this.cursor;
				this.updateBoardSquare(cursor.square);
			}
		}
		
		placeCursor(square) {
			this.cursor = {
				square: square,
				direction: 'horizontal'
			}
		}
		
		// A single square on the board
		updateBoardSquare(square) {
			let ui = this;
			
			let $div = $(`<div id='${square.id}'></div>`);
			
			// we're creating a bunch of callbacks below that close over the UI object
			
			if (square.tile) {
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
						stop: function() {
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
			} else {
				if (!ui.boardLocked()) {
					$div.on("click", () => {
						if (ui.currentlySelectedSquare) {
							ui.moveTile(ui.currentlySelectedSquare, square);
							ui.selectSquare(null);
						} else {
							if (ui.cursor) {
								if (ui.cursor.square == square) {
									// clicked on cursor to change direction
									if (ui.cursor.direction == 'horizontal') {
										ui.cursor.direction = 'vertical';
									} else {
										delete ui.cursor;
									}
								} else {
									// clicked on other square to move cursor
									ui.clearCursor();
									ui.placeCursor(square);
								}
							} else {
								ui.placeCursor(square);
							}
							ui.updateSquare(square);
						}
					})
					.droppable({
						hoverClass: "dropActive",
						drop: function(event, jui) {
							ui.deleteCursor();
							ui.moveTile(ui.idToSquare($(jui.draggable).attr("id")), square);
						}
					});
				}
				
				let text = ' ';
				const middle = Math.floor(ui.board.Dimension / 2);
				if (ui.cursor && ui.cursor.square == square) {
					text = (ui.cursor.direction == 'horizontal') ? '\u21d2' : '\u21d3';
					$div.addClass('Cursor');
					$('#dummyInput').focus();
				} else {
					switch (square.type) {
					case 'DoubleWord':
						if (square.x == middle && square.y == middle)
							text = STAR;
						else
							text = "DOUBLE WORD SCORE";
						
						break;
					case 'TripleWord':
						text = "TRIPLE WORD SCORE";
						break;
					case 'DoubleLetter':
						text = "DOUBLE LETTER SCORE";
						break;
					case 'TripleLetter':
						text = "TRIPLE LETTER SCORE";
					}
				}
				$div.addClass('Empty')
				.append($(`<a>${text}</a>`));
			}
			
			$(`#${square.id}`)
			.parent()
			.empty()
			.append($div);
		}
		
		drawBoard() {
			let board = this.board;
			const middle = Math.floor(board.Dimension / 2);

			let tab = $("<table></table>");
			for (let y = 0; y < board.Dimension; y++) {
				let tr = $("<tr></tr>");
				for (let x = 0; x < board.Dimension; x++) {
					let square = board.squares[x][y];
					let id = 'Board_' + x + "x" + y;
					square.id = id;
					let td = $(`<td></td>`);
					tr.append(td);
					td.addClass(square.type);
					if (x == middle && y == middle) {
						td.addClass('StartField');
					} else if (square.type != 'Normal') {
						td.addClass('SpecialField');
					}
					let $div = $(`<div id='${id}'><a></a></div>`);
					td.append($div);
				}
				tab.append(tr);
			}
			$('#board').append(tab);
			
			this.refreshBoard();
		}
		
		updateRackSquare(square) {
			let id = square.id;
			
			let $parent = $('#' + id).parent();
			
			let $div = $(`<div id='${id}'></div>`);
			$parent.empty().append($div);
			
			let $a = $("<a></a>");
			$div.append($a);
			
			let ui = this;
			// we're creating a bunch of callbacks below that close over the UI object
			
			if (square.tile) {
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
				$div.attr('class', 'Empty');
				
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
						ui.deleteCursor();
						ui.moveTile(ui.idToSquare($(jui.draggable).attr("id")), square);
					}
				});
			}
		}
		
		drawRack() {
			let rack = this.rack;
			
			let tab = $("<table></table>");
			let tr =  $("<tr></tr>");
			for (let x = 0; x < 8; x++) {
				let id = `Rack_${x}`;
				rack.squares[x].id = id;
				let td = $("<td class='Normal'></td>");
				td.append(`<div id='${id}'><a></a></div>`);
				tr.append(td);
			}
			tab.append(tr);
			let div = $("<div id='rackButtons'></div>");
			div.append("<button id='Shuffle'>Shuffle</button>");
			div.append("<br />");
			div.append("<button id='TakeBackTiles'>TakeBackTiles</button>");
			div.append(tab);
			$('#rack').append(div);
			
			let ui = this;
			$("#Shuffle").on('click', () => ui.shuffle());
			$("#TakeBackTiles").on('click', () => ui.takeBackTiles());

			for (let x = 0; x < 8; x++)
				ui.updateRackSquare(rack.squares[x]);
		}
		
		drawSwapRack() {
			let swapRack = this.swapRack;
			let tab = $("<table></table>");
			let tr = $("<tr></tr>");
			for (let x = 0; x < 7; x++) {
				let id = `SwapRack_${x}`;
				swapRack.squares[x].id = id;
				tr.append(`<td class='Normal'><div id='${id}><a></a></div></td>`);
			}
			$('#swapRack').append(tab);
			for (let x = 0; x < 7; x++) {
				this.updateRackSquare(swapRack.squares[x]);
			}
		}
		
		refreshRack() {
			let rack = this.rack;
			for (let x = 0; x < rack.squares.length; x++) {
				this.updateRackSquare(rack.squares[x]);
			}
		}
		
		refreshBoard() {
			let board = this.board;
			for (let y = 0; y < board.Dimension; y++) {
				for (let x = 0; x < board.Dimension; x++) {
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
				console.log(`SelectSquare - ${square.x}/${square.y}`);
				$(`#Board_${square.x}x${square.y}`)
				.addClass('Targeted');
			}
		}
		
		moveTile(fromSquare, toSquare) {
			let blankLetterRequesterButton = $("#blankLetterRequester button");
			let blankLetterRequesterSkip = $("#blankLetterRequesterSkip button");
			
			let tile = fromSquare.tile;
			let ui = this;

			function setLetter(letter) {
				tile.letter = letter;
				$.unblockUI();
				ui.updateSquare(toSquare);
				$('#dummyInput').focus();
				blankLetterRequesterSkip.off('click');
				blankLetterRequesterButton.off('keypress');
			}

			fromSquare.placeTile(null);
			fromSquare.owner.tileCount--;
			if (tile.isBlank() && !tile.letter || (tile.letter == ' ')) {
				if (fromSquare.owner != this.board && toSquare.owner == this.board) {
					blankLetterRequesterButton.on('keypress', function (event) {
						let letter = String.fromCharCode(event.charCode);
						if (letter != '') {
							letter = letter.toUpperCase();
							if (ui.legalLetters.indexOf(letter) != -1) {
								setLetter(letter);
							}
						}
					});
					blankLetterRequesterSkip.on('click', function (){
						setLetter("_")
					});
					$.blockUI({ message: $('#blankLetterRequester') });
				} else if (toSquare.owner == ui.rack || toSquare.owner == ui.swapRack) {
					tile.letter = ' ';
				}
			}
			toSquare.placeTile(tile);
			toSquare.owner.tileCount++;
			if (!this.boardLocked()) {
				setTimeout(function () { ui.updateGameStatus() }, 100);
			}
		}
		
		updateGameStatus() {
			$('#move').empty();
			this.displayRemainingTileCounts();
			if (this.board.tileCount > 0) {
				this.setMoveAction('commitMove', 'Make move');
				let move = this.board.calculateMove();
				if (move.error) {
					$('#move').append(move.error);
					$('#turnButton').attr('disabled', 'disabled');
				} else {
					$('#move').append(`<div>score: ${move.score}</div>`);
					for (const word of move.words)
						$('#move').append(`<div>${word.word} ${word.score}</div>`);
					$('#turnButton').removeAttr('disabled');
				}
				$('#TakeBackTiles').css('visibility', 'inherit');
				$('#swapRack').hide();
			} else if (this.swapRack.tileCount > 0) {
				this.setMoveAction('swapTiles', 'Swap tiles');
				$('#board .ui-droppable').droppable('disable');
				$('#turnButton').removeAttr('disabled');
				$('#TakeBackTiles').css('visibility', 'inherit');
			} else {
				this.setMoveAction('pass', 'Pass');
				$('#board .ui-droppable').droppable('enable');
				$('#turnButton').removeAttr('disabled');
				$('#TakeBackTiles').css('visibility', 'hidden');
			}
		}
		
		playAudio(id) {
			let audio = document.getElementById(id);
			
			if (audio.playing) {
				audio.pause();
			}
			
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
					$.blockUI({ message: `Move request returned error: ${textStatus} (${errorThrown})` });
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
			this.removeMoveEditButtons();
			$('#move').empty();
			this.boardLocked(true);
		}
		
		processMoveResponse(data) {
			console.log('move response:', data);
			data = icebox.thaw(data, ICE_TYPES);
			if (!data.newTiles) {
				console.log('expected new tiles, got ' + data);
			}
			for (const square of this.rack.squares) {
				if (data.newTiles.length && !square.tile) {
					square.placeTile(data.newTiles.pop());
					this.rack.tileCount++;
					this.updateRackSquare(square);
				}
			}
		}
		
		commitMove() {
			try {
				this.keyboardPlacements = [];
				let move = this.board.calculateMove();
				if (move.error) {
					$.blockUI({ message: move.error });
					return;
				}
				this.endMove();
				if (move.tilesPlaced.length == 7) {
					this.playAudio("applause");
				}
				for (let i = 0; i < move.tilesPlaced.length; i++) {
					let tilePlaced = move.tilesPlaced[i];
					let square = this.board.squares[tilePlaced.x][tilePlaced.y];
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
				$.blockUI({ message: `error in commitMove: ${e}`);
			}
		}
		
		addLastMoveActionButton(action, label) {
			let ui = this;
			let $button = $(`<button id='action'>${label}</button>`);
			$button.click(function() {
				ui[action]();
			});
			$('#log div.moveScore div.score').last().append($button);
		}
		
		addChallengeButton() {
			this.addLastMoveActionButton('challenge', 'Challenge');
		}
		
		addTakeBackMoveButton() {
			this.addLastMoveActionButton('takeBackMove', 'Take back move');
		}
		
		removeMoveEditButtons() {
			$('button#challenge').remove();
			$('button#takeBackMove').remove();
		}
		
		challenge() {
			this.takeBackTiles();
			this.endMove();
			this.sendMoveToServer('challenge');
		}
		
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
			console.log('makeMove =>', action);
			this.deleteCursor();
			this[action]();
		}
		
		deleteCursor() {
			if (this.cursor) {
				let cursorSquare = this.cursor.square;
				delete this.cursor;
				this.updateBoardSquare(cursorSquare);
			}
		}
		
		setCursor(square, direction) {
			if (this.cursor) {
				let oldCursorSquare = this.cursor.square;
				this.cursor.square = square;
				this.updateBoardSquare(oldCursorSquare);
			} else {
				this.cursor = { square: square,
								direction: (direction || 'horizontal') };
			}
			this.updateBoardSquare(square);
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
			
			for (let y = 0; y < this.board.Dimension; y++) {
				for (let x = 0; x < this.board.Dimension; x++) {
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
			this.deleteCursor();
			this.updateGameStatus();
		}
		
		shuffle() {
			function random(i) {
				return Math.floor(Math.random() * i);
			}
			for (let i = 0; i < 16; i++) {
				let from = this.rack.squares[random(8)];
				let to = this.rack.squares[random(8)];
				let tmp = from.tile;
				from.tile = to.tile;
				to.tile = tmp;
			}
			this.refreshRack();
		}
		
		enableNotifications() {
			// must be called in response to user action
			if (window.webkitNotifications) {
				console.log('notification permission:', window.webkitNotifications.checkPermission());
				if (window.webkitNotifications.checkPermission() != 0) {
					console.log('requesting notification permission');
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
