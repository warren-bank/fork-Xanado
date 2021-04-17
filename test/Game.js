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
	let player1 = new Player("player one", 7);
	player1.isRobot = true;
	let player2 = new Player("player two", 7);
	let game = new Game("English_Scrabble",
						[ player1, player2 ], "Custom_English");
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
	game.saver = saver;
	game.load()
	.then(() => game.save())
	.then(async game => {
		while (true) {
			await db.get(gameKey, Game.classes)
			.then(game => {
				game.saver = saver;
				return game.players[player].autoplay(game)
				.then(() => game);
			})
			.then(game => game.save());
			if (game.ended) {
				console.log(game.ended);
				break;
			}
			player = (player + 1) % 2;
		}
		console.log("Game over");
	});
});

