/* eslint-env browser */

// For games.html; populate the list of live games

requirejs(["jquery"], () => {
	$(document).ready(function() {
		// AJAX request for list of games
		$.getJSON('/games', function(data) {
			if (data.length == 0) {
				$("#active_games").hide();
				return;
			}
			$("#active_games").show();
			let $gt = $('#game-table');
			data.map(game => {
				let $p = $(`<div>${game.players.length} player ${game.edition}</div>`);
				if (game.dictionary)
					$p.append(`, using ${game.dictionary}`);
				if (game.time_limit > 0)
					$p.append(`, time limit ${game.time_limit} minutes`);
				
				game.players.map(player => {
					let $but = $(`<button class="player">${player.name}</button>`);
					if (/^robot\d+$/.test(player.name))
						$but.prop("disabled", true);
					else {
						if (player.connected)
							$but.prop("disabled", true);
						let $a = $(`<a href='/game/${game.key}/${player.key}'></a>`);
						$a.append($but);
						$but = $a;
					}
					$p.append($but);
				});
				$gt.append($p);
			});
		});
	});
});
