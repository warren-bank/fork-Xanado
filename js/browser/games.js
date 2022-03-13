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
	function $player(game, player) {
		const $tr = Player.prototype.createScoreDOM.call(
			player, loggedInAs.key);
		
		if (game.state === 'playing') {
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
					.text($.i18n('Open', player.name))
					.button()
					.on('click', () => {
						console.log(`Join game ${game.key}/${loggedInAs.key}`);
						$.post(`/join/${game.key}/${loggedInAs.key}`)
						.then(info => {
							window.open(
								`/html/game.html?game=${game.key}&player=${loggedInAs.key}`,
								"_blank");
							refresh();
						})
						.catch(report);
					}));

				$box.append(
					$("<button name='leave' class='risky'></button>")
					.text($.i18n("Leave"))
					.button()
					.on('click', () => {
						console.log(`Leave game ${game.key}`);
						$.post(`/leave/${game.key}/${loggedInAs.key}`)
						.then(refresh)
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
	 * @param {object} game a Game.catalogue() NOT a Game object
	 */
	function $game(game) {
		const $box = $(`<div class="game" id="${game.key}"></div>`);

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

		if (game.state !== 'playing')
			msg.push(`<b>${$.i18n(game.state)}</b>`);

		const $twistButton =
			  $("<button name='twist'></button>")
			  .button({ label: TWIST_OPEN })
			  .addClass("no-padding")
			  .on("click", () => {
				  $twist.toggle();
				  const isOpen = $twist.is(":visible");
				  $twistButton
				  .button("option", "label",
						  isOpen ? TWIST_CLOSE : TWIST_OPEN);
			  });
		$box.append($twistButton);
		$box.append(msg.join(', '));

		const $twist = $("<div class='twist'></div>").hide();
		$box.append($twist);
		
		const $table = $("<table class='playerTable'></table>");
		$twist.append($table);
		game.players.map(
			(player, index) => $table.append($player(game, player)));

		$(`#player${game.whosTurnKey}`).addClass('whosTurn');

		if (game.state === 'playing'
			&& loggedInAs
			&& (game.maxPlayers === 0
				|| game.players.length < game.maxPlayers)) {

			if (!game.players.find(p => p.key === loggedInAs.key)) {
				// Can join game
				$twist.append(
					$(`<button name='join'></button>`)
					.text($.i18n('Join'))
					.button()
					.on('click', () => {
						console.log(`Join game ${game.key}`);
						$.post(`/join/${game.key}/${loggedInAs.key}`)
						.then(info => {
							window.open(`/html/game.html?game=${info.gameKey}&player=${info.playerKey}`, "_blank");
							refresh();
						})
						.catch(report);
					}));
			}

			if (!game.players.find(p => p.isRobot)) {
				$twist.append(
					$(`<button name='robot'></button>`)
					.text($.i18n("Add robot"))
					.button()
					.on('click', () =>
						openDialog("AddRobotDialog", { gameKey: game.key })));
			}
		}
			
		if (loggedInAs) {
			if (game.state !== 'playing' && !game.nextGameKey) {
				$twist.append(
					$("<button name='another'></button>")
					.text($.i18n('Another game'))
					.on('click',
						() => $.post(`/anotherGame/${game.key}`)
						.then(refresh)
						.catch(report)));
			}

			$twist.append(
				$("<button name='delete' class='risky'></button>")
				.text($.i18n("Delete"))
				.button()
				.on('click', () => $.post(`/deleteGame/${game.key}`)
					.then(refresh)
					.catch(report)));
		}
			
		return $box;
	}

	function showGames(games) {
		if (games.length === 0) {
			$('#gamesList').hide();
			return;
		}
		$('#gamesList').show();
		const $gt = $('#gamesTable');
		$gt.empty();

		games.forEach(game => $gt.append($game(game)));

		const ema = games.reduce((em, game) => {
			// game is Game.catalogue(), not a Game object
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

	function refresh_games() {
		return $.get("/games", {
			all: $('#showAllGames').is(':checked')
		})
		.then(showGames)
		.catch(report);
	}
	
	function refresh() {
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
				console.log(e);
				$(".logged-in").hide();
				$(".not-logged-in").show();
				$("#create-game").hide();
			}),

			refresh_games(),

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

	function openDialog(dlg, options) {
		Dialog.open(dlg, $.extend(options || {}, {
			done: refresh,
			error: report
		}));
	}

	browserApp.then(() => {

		const socket = io.connect(null);

		$("button")
		.button();

		$("#showAllGames")
		.on('change', refresh_games);

		$('#reminder-button')
		.on('click', () => {
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
		.on("click", () => openDialog("CreateGameDialog"));

		$("#login-button")
		.on("click", () => openDialog("LoginDialog"));

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
		.on("click", () => openDialog("ChangePasswordDialog"));
	
		refresh();

		socket
		.on('connect', () => console.debug('Server: Socket connected'))
		.on('update', () => refresh());

		$(document).tooltip({
			items: '[data-i18n-tooltip]',
			content: function() {
				return $.i18n($(this).data('i18n-tooltip'));
			}
		});

		socket.emit('monitor');
	});
});
