/* eslint-env browser */

// For games.html; populate the list of live games

requirejs(["jquery", "socket.io"], (jq, io) => {
	const BLACK_CIRCLE = '\u25cf';
	const ROBOT_FACE = ' <img class="glyph" src="/images/robotface.png" />';
	
	$(document).ready(() => {

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
					let $p = $(`<div>${game.players.length} player ${game.edition}</div>`);
					if (game.dictionary)
						$p.append(`, using ${game.dictionary}`);
					if (game.time_limit > 0)
						$p.append(`, time limit ${game.time_limit} minutes`);
					
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
					let $a = $(`<a href='/deletegame/${game.key}'></a>`);
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
		.on('connect', data => console.debug('Server: Socket connected'))
		.on('update', () => refresh());

		socket.emit('monitor');
	});
});
