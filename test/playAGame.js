/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env node */

/**
 * This is NOT a unit test, it is a stand-alone test for the game engine.
 * It will play a complete game between two robot players. It does not test
 * the server.
 */
const requirejs = require('requirejs');

requirejs.config({
	baseUrl: "..",
    nodeRequire: require,
	paths: {
		game: "js/game",
		server: "js/server",
		dawg: "js/dawg",

		platform: "js/server"
	}
});

requirejs(["platform/Platform", "game/Edition", "game/Tile", "game/Rack", "game/Square", "game/Player", "game/Game", "game/LetterBag", "game/Board", "game/Move"], (Platform, Edition, Tile, Rack, Square, Player, Game, LetterBag, Board, Move) => {

	let db = new Platform.Database("test", "testgame");
	let game = new Game("Tiny", "SOWPODS_English");
	let gameKey = game.key;
	let saver = game => {
		console.log(`Saving game ${game.key}`);
		return db.set(gameKey, game)
		.then(() => {
			console.log(`Saved game ${game.key}`);
			return game;
		});
	};
	let player = 0;

	game.create()
	.then(game => {
		let player1 = new Player("player one", true);
		game.addPlayer(player1);
		let player2 = new Player("player two", true);
		game.addPlayer(player2);
		game.saver = saver;
		console.log(player1.toString());
		return game.save();
	})
	.then(async game => {
		let finished = false;
		while (!finished) {
			await db.get(gameKey, Game.classes)
			.then(game => {
				game.saver = saver;
				return game.autoplay(game.players[player])
				.then(() => game);
			})
			.then(game => {
				if (game.ended) {
					console.log(game.ended);
					finished = true;
				}
				player = (player + 1) % 2;
				return game.save();
			})
		}
		console.log("Game over");
	});
});

