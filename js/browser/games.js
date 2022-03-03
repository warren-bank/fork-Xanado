/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env browser, jquery */

/**
 * Browser app for games.html; populate the list of live games
 */
requirejs(['browser/browserApp', 'browser/Dialog', 'socket.io', 'jquery'], (browserApp, Dialog, io) => {
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

	// Format a player
	function $player(game, player, index) {
		let $box = $("<div></div>")
			.text($.i18n("Player $1", index + 1) + ': ')
			.append($(`<b>${player.name}</b>`));

		const $icon = $('<div class="ui-icon"></div>');
		$icon.addClass(player.isRobot ? "icon-robot" : "icon-person");
		$box.prepend($icon);

		if (game.ended) {
			const winningScore = game.players.reduce(
				(max, p) =>
				Math.max(max, p.score), 0);
			const s = `: ${player.score}`;
			$box.append(s);
			
			if (player.score === winningScore) {
				$box
				.addClass("winner")
				.append('<div class="ui-icon icon-winner"></div>');
			}

			return $box;

		}

		if (loggedInAs && player.key === loggedInAs.key) {
			$box.append(
				$(`<button name="join" class='game-button'></button>`)
				.text($.i18n('Open', player.name))
				.button()
				.on('click', () => {
					console.log(`Join game ${game.key}/${loggedInAs.key}`);
					$.post(`/join/${game.key}/${loggedInAs.key}`)
					.then(info => {
						window.open(`/html/game.html?game=${game.key}&player=${loggedInAs.key}`, "_blank");
						refresh();
					})
					.catch(report);
				}));

			$box.append(
				$(`<button class='game-button risky'></button>`)
				.text($.i18n("Leave"))
				.button()
				.on('click', () => {
					console.log(`Leave game ${game.key}`);
					$.post(`/leave/${game.key}/${loggedInAs.key}`)
					.then(refresh)
					.catch(report);
				}));

			return $box;
		}

		if (!player.isRobot) {
			const $spot = $(`<span class="player-icon">${BLACK_CIRCLE}</span>`);
			if (player.connected)
				$spot.addClass('online');
			else
				$spot.addClass('offline');
			$box.append($spot);
		}

		return $box;
	}

	/**
	 * Construct a div that shows the state of the given game
	 * @param {object} game a Game.catalogue() NOT a Game object
	 */
	function $game(game) {
		const $box = $(`<div class="game"></div>`);

		const msg = [
			//game.key, // debug only
			$.i18n("edition $1", game.edition)
		];
		if (game.dictionary)
			msg.push($.i18n("dictionary $1", game.dictionary));

		if (game.robot_dictionary && game.robot_dictionary !== game.dictionary)
			msg.push($.i18n("robot dictionary $1", game.robot_dictionary));

		if (game.maxPlayers > 1)
			msg.push($.i18n("up to $1 players", game.maxPlayers));

		if (game.time_limit > 0)
			msg.push($.i18n("time limit $1", game.time_limit));

		if (game.ended)
			msg.push(`<b>${$.i18n(game.ended)}</b>`);

		const $twist = $("<div></div>").hide();
		const $twistButton =
			  $("<button class='game-button no-padding'></button>")
			  .button({ label: TWIST_OPEN })
			  .on("click", () => {
				  $twist.toggle();
				  const isOpen = $twist.is(":visible");
				  $twistButton
				  .button("option", "label",
						  isOpen ? TWIST_CLOSE : TWIST_OPEN);
			  });
		$box.append($twistButton);
		$box.append(msg.join(', '));
		$box.append($twist);

		game.players.map(
			(player, index) =>
			$twist.append($player(game, player, index)));

		if (!game.ended
			&& loggedInAs
			&& (game.maxPlayers === 0
				|| game.players.length < game.maxPlayers)) {

			if (!game.players.find(p => p.key === loggedInAs.key)) {
				// Can join game
				$twist.append(
					$(`<button class='game-button'></button>`)
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
					$(`<button class="game-button"></button>`)
					.text($.i18n("Add robot"))
					.button()
					.on('click', () => {
						console.log(`Add robot to game ${game.key}`);
						$.post(`/addRobot/${game.key}`)
						.then(refresh)
						.catch(report);
					}));
			}
		}
			
		if (loggedInAs) {
			if (!game.ended && game.players.find(p => !p.isRobot)) {
				$twist.append(
					$("<button class='game-button'></button>")
					.text($.i18n("Email turn reminder"))
					.button()
					.tooltip({
						content: $.i18n("tooltip-email-reminder")
					})
					.on("click", () => {
						$.post(`/sendReminder/${game.key}`)
						.then(info => $('#alertDialog')
							  .text($.i18n.apply(null, info))
							  .dialog({
								  title: $.i18n("Email turn reminder"),
								  modal: true
							  }))
						.catch(report);
					}));
			}

			$twist.append(
				$(`<button class='game-button risky'></button>`)
				.text($.i18n("Delete"))
				.button()
				.on('click', () => {
					$.post(`/deleteGame/${game.key}`)
					.then(refresh)
					.catch(report);
				}));
			
		}
			
		return $box;
	}

	function showGames(data) {
		if (data.length === 0) {
			$('#games_list').hide();
			return;
		}
		$('#games_list').show();
		const $gt = $('#game-table');
		$gt.empty();
		data.forEach(game => $gt.append($game(game)));
		const ema = data.reduce((em, game) => {
			// game is Game.catalogue(), not a Game object
			if (game.ended
				|| !game.players
				|| !game.players[game.whosTurn])
				return em;
			return em || game.players[game.whosTurn].email;
		}, false);
		if (ema && loggedInAs)
			$('#reminder-button').show();
		else
			$('#reminder-button').hide();
	}

	function refresh_games() {
		return $.get("/games", {
			all: $('#showall').is(':checked')
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
					$('#games-cumulative').hide();
					return;
				}
				let n = 1;
				$('#games-cumulative').show();
				const $gt = $('#player-list');
				$gt.empty();
				data.forEach(player => {
					const s = $.i18n(
						'games-scores', n++, player.name, player.score,
						player.wins);
					$gt.append(`<div>${s}</div>`);
				});
			})
			.catch(report)
		]);
	}

	function openDialog(dlg) {
		Dialog.open(dlg, {
			done: refresh,
			error: report
		});
	}

	browserApp.then(() => {

		const socket = io.connect(null);

		$("#showall")
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
