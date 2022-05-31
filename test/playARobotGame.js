/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env node */

/**
 * This is NOT a unit test, it is a stand-alone test for the game engine.
 * It will play a complete game between two robot players. It does not test
 * the server.
 */
requirejs = require("requirejs");

requirejs.config({
	baseUrl: "..",
    nodeRequire: require,
	paths: {
		common: "js/common",
		game: "js/game",
		server: "js/server",
		dawg: "js/dawg",

		platform: "js/server/ServerPlatform"
	}
});

requirejs([
	"platform", "game/Edition", "game/Tile", "game/Rack",
	"game/Square", "game/Player", "game/Game", "game/LetterBag",
	"game/Board", "game/Move"
], (
	Platform, Edition, Tile, Rack,
	Square, Player, Game, LetterBag,
	Board, Move
) => {

	let db = new Platform.Database("test/temp", "testgame");
	let game = new Game({
		//_debug: console.debug,
		edition: "Tiny",
		dictionary: "CSW2019_English"
	});
	let gameKey = game.key;
	let player = 0;

	game.create()
    .then(() => game.onLoad(new Platform.Database("test/temp", "game")))
	.then(game => {
		let player1 = new Player({
			name: "player one", key: "flay", isRobot: true});
		game.addPlayer(player1);
		let player2 = new Player({name: "player two", key: "swelter",
								 isRobot: true });
		game.addPlayer(player2);
		game.whosTurnKey = player1.key;
		return game.onLoad(db);
	})
	.then(game => game.save())
	.then(async game => {
		let finished = false;
		while (!finished) {
			await db.get(gameKey, Game.classes)
			.then(game => game.onLoad(db))
			.then(game => {
				return game.autoplay(game.getPlayer())
				.then(turn => {
					if (game.hasEnded()) {
						console.log(game.state);
						finished = true;
					}
					return game.save();
				});
			});
		}
		console.log("Robot game over");
	});
});

