/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env browser, jquery */

/**
 * Browser app for games.html; populate the list of live games
 */
requirejs([
	'socket.io',
	'browser/browserApp', 'browser/Dialog',
	'game/Player',
	'jquery'
], (
	io,
	browserApp, Dialog,
	Player
) => {
	const BLACK_CIRCLE = '\u25cf';
	const NEXT_TO_PLAY = '\u25B6';
	const TWIST_OPEN = '\u25BC';
	const TWIST_CLOSE = '\u25B2';

	let loggedInAs;

	/**
	 * Report an error contained in an ajax response
	 * The response is either a string, or a JSON-encoded
	 * array containing a message code and arguments.
	 */
	function report(jqXHR, textStatus, errorThrown) {
		const info = JSON.parse(jqXHR.responseText);
		if (!info || info.length === 0)
			return;
		const text = $.i18n.apply(null, info);
		$('#alertDialog')
		.text(text)
		.dialog({ modal: true });
	}

	// Format a player in a game score table
	function $player(game, player, isActive) {
		const $tr = Player.prototype.createScoreDOM.call(
			player, loggedInAs ? loggedInAs.key : undefined, isActive);
		
		if (isActive) {
			if (player.dictionary && player.dictionary !== game.dictionary) {
				const dic = $.i18n("using dictionary $1", player.dictionary);
				$tr.append(`<td>${dic}</td>`);
			}

			if (game.secondsPerPlay > 0 && player.secondsToPlay > 0) {
				const left = $.i18n("$1s left to play",
									player.secondsToPlay / 1000);
				$tr.append(`<td>${left}</td>`);
			}
			
		} else {
			const winningScore = game.players.reduce(
				(max, p) =>
				Math.max(max, p.score), 0);
			
			if (player.score === winningScore) {
				$tr.append('<td class="ui-icon icon-winner"></td>');
			}

			return $tr;
		}

		if (loggedInAs) {
			const $box = $("<td></td>");
			$tr.append($box);

			if (player.key === loggedInAs.key) {
				$box.append(
					$("<button name='join'></button>")
					.text($.i18n("Open game", player.name))
					.button()
					.on('click', () => {
						console.log(`Join game ${game.key}/${loggedInAs.key}`);
						$.post(`/join/${game.key}/${loggedInAs.key}`)
						.then(info => {
							window.open(
								`/html/game.html?game=${game.key}&player=${loggedInAs.key}`,
								"_blank");
							refresh_game(game.key);
						})
						.catch(report);
					}));

				$box.append(
					$("<button name='leave' class='risky'></button>")
					.text($.i18n("Leave game"))
					.button()
					.on('click', () => {
						console.log(`Leave game ${game.key}`);
						$.post(`/leave/${game.key}/${loggedInAs.key}`)
						.then(() => refresh_game(game.key))
						.catch(report);
					}));

			} else if (!player.isRobot && game.whosTurnKey === player.key) {
				$box.append(
					$("<button name='email'></button>")
					.text($.i18n("Email reminder"))
					.button()
					.tooltip({
						content: $.i18n("tooltip-email-reminder")
					})
					.on("click", () => {
						console.log("Send reminder");
						$.post(`/sendReminder/${game.key}`)
						.then(info => $('#alertDialog')
							  .text($.i18n.apply(null, info))
							  .dialog({
								  title: $.i18n("Reminded $1", player.name),
								  modal: true
							  }))
						.catch(report);
					}));
			}
		}

		return $tr;
	}

	/**
	 * Construct a table that shows the state of the given game
	 * @param {Game|object} game a Game or Game.simple
	 * @param {object} isOpen map from game key to boolean
	 */
	function $game(game, isOpen) {
		const $box = $(`<div class="game" id="${game.key}"></div>`);
		const $twist = $("<div class='twist'></div>");
		const $twistButton =
			  $("<button name='twist'></button>")
			  .button({ label: TWIST_OPEN })
			  .addClass("no-padding")
			  .on("click", () => showHideTwist(!$twist.is(":visible")));

		function showHideTwist(show) {
			if (show) {
				$twist.show();
				$twistButton.button("option", "label", TWIST_CLOSE);
			} else {
				$twist.hide();
				$twistButton.button("option", "label", TWIST_OPEN);
			}
		}

		showHideTwist(isOpen && isOpen[game.key]);

		const msg = [
			//game.key, // debug only
			$.i18n("edition $1", game.edition)
		];
		if (game.dictionary)
			msg.push($.i18n("dictionary $1", game.dictionary));

		if (game.maxPlayers > 1)
			msg.push($.i18n("up to $1 players", game.maxPlayers));

		if (game.secondsPerPlay > 0)
			msg.push($.i18n("time limit $1", game.secondsPerPlay / 60));

		const isActive = (game.state === 'playing');

		if (!isActive)
			msg.push(`<b>${$.i18n(game.state)}</b>`);

		$box.append($twistButton);
		$box.append(msg.join(', '));
		$box.append($twist);
		
		const $table = $("<table class='playerTable'></table>");
		$twist.append($table);
		game.players.forEach(
			player => $table.append($player(game, player, isActive)));

		if (isActive)
			// .find because it's not in the document yet
			$table.find(`#player${game.whosTurnKey}`).addClass('whosTurn');

		if (isActive
			&& loggedInAs
			&& (game.maxPlayers === 0
				|| game.players.length < game.maxPlayers)) {

			if (!game.players.find(p => p.key === loggedInAs.key)) {
				// Can join game
				const $join = $(`<button name="join"></button>`);
				$twist.append($join);
				$join.text($.i18n("Join game"))
				.button()
				.on('click', () => {
					console.log(`Join game ${game.key}`);
					$.post(`/join/${game.key}/${loggedInAs.key}`)
					.then(info => {
						window.open(`/html/game.html?game=${info.gameKey}&player=${info.playerKey}`, "_blank");
						refresh_game(game.key);
					})
					.catch(report);
				});
			}

			if (!game.players.find(p => p.isRobot)) {
				$twist.append(
					$(`<button name='robot'></button>`)
					.text($.i18n("Add robot"))
					.button()
					.on('click', () =>
						Dialog.open("AddRobotDialog", {
							gameKey: game.key,
							done: () => refresh_game(game.key),
							error: report
						})));
			}
		}
			
		if (loggedInAs) {
			if (!(isActive || game.nextGameKey)) {
				$twist.append(
					$("<button name='another'></button>")
					.text($.i18n("Another game like this"))
					.on('click',
						() => $.post(`/anotherGame/${game.key}`)
						.then(refresh_games)
						.catch(report)));
			}

			$twist.append(
				$("<button name='delete' class='risky'></button>")
				.text($.i18n("Delete"))
				.button()
				.on('click', () => $.post(`/deleteGame/${game.key}`)
					.then(refresh_games)
					.catch(report)));
		}
			
		return $box;
	}


	/**
	 * Refresh the display of a single game
	 * @param {Game|object} game a Game or Game.simple
	 */
	function show_game(game) {
		const isOpen = {};
		isOpen[game.key] = $(`#${game.key} .twist`).is(":visible");
		console.log(`Reshow ${game.key} ${isOpen[game.key]}`);
		$(`#${game.key}`).replaceWith($game(game, isOpen));
	}

	/**
	 * Refresh the display of all games
	 * @param {object[]} games array of Game.simple
	 */
	function show_games(games) {
		if (games.length === 0) {
			$('#gamesList').hide();
			return;
		}

		const isOpen = {};
		$(".game").each(function() {
			isOpen[this.id] = $(this).find('.twist').is(":visible");
		});
		const $gt = $('#gamesTable');
		$gt.empty();

		games.forEach(game => $gt.append($game(game, isOpen)));

		$('#gamesList').show();
		const ema = games.reduce((em, game) => {
			// game is Game.simple, not a Game object
			if (game.state !== 'playing'
				|| !game.players
				|| !game.players.find(p => p.key === game.whosTurnKey))
				return em;
			return em || game.players.find(p => p.key === game.whosTurnKey)
			.email;
		}, false);
		if (ema && loggedInAs)
			$('#reminder-button').show();
		else
			$('#reminder-button').hide();
	}

	/**
	 * Request an update for a single game (which must exist in the
	 * games table)
	 * @param {string} key Game key
	 */
	function refresh_game(key) {
		return $.get(`/simple/${key}`)
		.then(simple => show_game(simple[0]))
		.catch(report);
	}

	/**
	 * Request an update for all games
	 */
	function refresh_games() {
		console.debug("refresh_games");
		const what = $('#showAllGames').is(':checked') ? 'all' : 'active';
		return $.get(`/simple/${what}`)
		.then(show_games)
		.catch(report);
	}

	/**
	 * Request an update for session status and all games lists
	 */
	function refresh() {
		console.debug("refresh");
		return Promise.all([
			$.get("/session")
			.then(session => {
				loggedInAs = session;
				console.log("Signed in as", session.name);
				$(".not-logged-in").hide();
				$(".logged-in").show()
				.find("span").first().text(session.name);
				$("#create-game").show();
				$("#chpw_button").toggle(session.provider === 'xanado');
			})
			.catch(e => {
				$(".logged-in").hide();
				$(".not-logged-in").show();
				$("#create-game").hide();
			})
			.then(refresh_games),

			$.get("/history")
			.then(data => {
				if (data.length === 0) {
					$('#gamesCumulative').hide();
					return;
				}
				let n = 1;
				$('#gamesCumulative').show();
				const $gt = $('#player-list');
				$gt.empty();
				data.forEach(player => {
					const s = $.i18n(
						'games-scores', n++, player.name, player.score,
						player.wins);
					$gt.append(`<div class="player-cumulative">${s}</div>`);
				});
			})
			.catch(report)
		]);
	}

	browserApp.then(() => {

		const socket = io.connect(null);

		$("button")
		.button();

		$("#showAllGames")
		.on('change', refresh_games);

		$('#reminder-button')
		.on('click', () => {
			console.log("Send reminders");
			$.post("/sendReminder/*")
			.then(info => $('#alertDialog')
				  .text($.i18n.apply(null, info))
				  .dialog({
					  title: $.i18n("Email turn reminders"),
					  modal: true
				  }))
			.catch(report);
		});

		$("#create-game")
		.on("click", () => Dialog.open("CreateGameDialog", {
			done: refresh_games,
			error: report
		}));

		$("#login-button")
		.on("click", () => Dialog.open("LoginDialog", {
			done: refresh,
			error: report
		}));

		$("#logout-button")
		.on('click', () => {
			$.post("/logout")
			.then(result => {
				console.log("Logged out", result);
				loggedInAs = undefined;
				refresh();
			})
			.catch(report);
		});

		$("#chpw_button")
		.on("click", () => Dialog.open("ChangePasswordDialog", {
			done: refresh,
			error: report
		}));
	
		//refresh(); do this in 'connect' handler

		socket

		.on('connect', () => {
			console.debug("--> connect");
			refresh();
		})

		.on('disconnect', () => {
			console.debug("--> disconnect");
			refresh();
		})

		// Custom messages

		.on('update', () => {
			console.debug("--> update");
			// Can be smarter than this!
			refresh();
		});
		$(document).tooltip({
			items: '[data-i18n-tooltip]',
			content: function() {
				return $.i18n($(this).data('i18n-tooltip'));
			}
		});

		socket.emit('monitor');
	});
});
