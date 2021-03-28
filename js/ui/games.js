/* eslint-env browser */

// For games.html; populate the list of live games

requirejs(["browserApp", "socket.io"], (browserApp, io) => {
	const BLACK_CIRCLE = '\u25cf';
	const ROBOT_FACE = ' <img class="glyph" src="/images/robotface.png" />';
	
	browserApp.then(() => {

		function refresh() {
			console.log("Refreshing");
			// AJAX request for list of games
			$.getJSON('/games', function(data) {
				if (data.length == 0) {
					$("#active_games").hide();
					return;
				}
				$("#active_games").show();
				let $gt = $('#game-table');
				$gt.empty();
				data.map(game => {
					let msg = $.i18n('msg-game-desc', game.players.length, game.edition);
					let $p = $(`<div>${msg}</div>`);
					if (game.dictionary)
						$p.append($.i18n('msg-using-dict', game.dictionary));
					if (game.time_limit > 0)
						$p.append($.i18n('msg-time-limit', game.time_limit));
					
					game.players.map(player => {
						let $but = $(`<button class="player">${player.name}</button>`);
						if (player.isRobot) {
							$but.append(ROBOT_FACE);
							$but.prop("disabled", true);
						} else {
							if (player.connected)
								$but.append(` <span class="greenDot">${BLACK_CIRCLE}</span>`);
							let $a = $(`<a href='/game/${game.key}/${player.key}'></a>`);
							$a.append($but);
							$but = $a;
						}
						$p.append($but);
					});
					let $a = $(`<a href='/deleteGame/${game.key}'></a>`);
					$a.append(`<button class="deleteGame">DELETE</button>`);
					$p.append($a);
					$gt.append($p);
				});
			});
		}

		refresh();
		
		let transports = ['websocket', 'flashsocket', 'htmlfile', 'xhr-multipart', 'xhr-polling', 'jsonp-polling'];
		if (navigator.userAgent.search("Firefox") >= 0) {
			transports = ['htmlfile', 'xhr-polling', 'jsonp-polling'];
		}

		let socket = io.connect(null, { transports: transports });

		socket
		.on('connect', () => console.debug('Server: Socket connected'))
		.on('update', () => refresh());

		socket.emit('monitor');
	});
});
