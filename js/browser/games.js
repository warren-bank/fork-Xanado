/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env browser, jquery */

/**
 * Browser app for games.html; populate the list of live games
 */
requirejs(['browser/browserApp', 'socket.io'], (browserApp, io) => {
	const BLACK_CIRCLE = '\u25cf';
	const NEXT_TO_PLAY = '\u25B6';

	// Format a player
	function formatPlayer(game, player, index) {
		const $but = $(`<button class='player'>${player.name}</button>`);
		if (game.whosTurn === index)
			$but.prepend(NEXT_TO_PLAY);
		if (player.isRobot) {
			$but.append('<img class="robot" src="/images/robotface.png"></img>');
			$but.prop('disabled', true);
			return $but;
		}
		const $spot = $(`<span>${BLACK_CIRCLE}</span>`);
		if (player.connected)
			$spot.addClass('online');
		else
			$spot.addClass('offline');
		$but.append($spot);
		const $a = $(`<a href='/game/${game.key}/${player.key}'></a>`);
		$a.append($but);
		return $a;
	}

	// Format a game
	function formatGame(game) {
		const $p = $(`<div></div>`);

		const msg = [ $.i18n('game-description',
						   game.players.length, game.edition) ];
		if (game.dictionary)
			msg.push($.i18n('game-using-dict', game.dictionary));
		if (game.time_limit > 0)
			msg.push($.i18n('game-time-limit', game.time_limit));
		if (game.ended) {
			const winningScore = game.players.reduce(
				(max, p) =>
				Math.max(max, p.score), 0);
			const results = game.players.map(p => {
				const s = `${p.name}:${p.score}`;
				if (p.score === winningScore)
					return `<span class='winner'>${s}</span>`;
				else
					return s;
			}).join(', ');
			msg.push($.i18n(game.ended, results));
			$p.append(msg.join(', '));
		} else {
			$p.append(msg.join(', '));
			game.players.map((player, index) => $p.append(formatPlayer(game, player, index)));
		}

		const $but = $(`<button class='deleteGame'>${$.i18n('game-delete')}</button>`);
		$but.on('click', () => {
			console.log(`Delete game ${game.key}`);
			$.ajax({
				type: 'POST',
				url: `/deleteGame/${game.key}`,
				success: refresh,
				error: function(jqXHR, textStatus, errorThrown) {
					console.error(`deleteGame returned error: ${textStatus} (${errorThrown})`);
				}
			});
		});
		$p.append(' ').append($but);
		return $p;
	}

	function handle_listGames(data) {
		if (data.length === 0) {
			$('#games_list').hide();
			return;
		}
		$('#games_list').show();
		const $gt = $('#game-table');
		$gt.empty();
		data.forEach(game => $gt.append(formatGame(game)));
		const ema = data.reduce((em, game) => {
			if (game.ended)
				return em;
			return em || game.players[game.whosTurn].email;
		}, false);
		if (ema)
			$('#reminder-button').show();
		else
			$('#reminder-button').hide();
	}

	function handle_history(data) {
		const ps = Object.getOwnPropertyNames(data.scores);
		if (ps.length === 0) {
			$('#player_list').hide();
			return;
		}
		$('#player_list').show();
		const $gt = $('#player-table');
		$gt.empty();
		ps.forEach(name => $gt.append(
			$.i18n('games-scores', name, data.scores[name],
				   data.wins[name] || 0)));
	}

	function refresh_games() {
		$.getJSON(`/games`,
				  { all: $('#showall').is(':checked') },
				  data => handle_listGames(data));
	}
	
	function refresh() {
		refresh_games();
		$.getJSON('/history', data => handle_history(data));
	}

	browserApp.then(() => {

		const socket = io.connect(null);

		$("#showall").on('change', refresh_games);
		$('#reminder-button').attr(
			'title', $.i18n('tooltip-email-reminders'))
		.on('click', () => {
			$.ajax({
				type: 'POST',
				url: `/sendReminders`,
				success: data => {
					refresh();
					let mess = data
						.map(p => $.i18n('reminder', p.name, p.email))
						.join(', ');
					alert($.i18n('alert-reminders', mess));
				},
				error: function(jqXHR, textStatus, errorThrown) {
					console.error(`sendReminders returned error: ${textStatus} (${errorThrown})`);
				}
			});
		});
		refresh();

		socket
		.on('connect', () => console.debug('Server: Socket connected'))
		.on('update', () => refresh());

		socket.emit('monitor');
	});
});
