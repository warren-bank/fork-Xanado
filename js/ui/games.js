/* eslint-env browser */

// For games.html; populate the list of live games

requirejs(["jquery"], () => {
	$(document).ready(function() {
		// AJAX request for list of games
		$.getJSON('/games', function(data) {
			let $gt = $('#game-table');
			data.map(game => {
				let $p = $(`<div>${game.players.length} player ${game.edition}: </div>`);
				game.players.map(player => {
					let $a = $(`<a href='/game/${game.key}/${player.key}'></a>`);
					let $but = $(`<button>Play as ${player.name}</button>`);
					if (player.connected)
						$but.attr("disabled", "disabled");
					$a.append($but);
					$p.append($a);
				});
				$gt.append($p);
			});
		});
	});
});
