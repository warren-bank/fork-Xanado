/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env node, mocha */

/**
 * Test first play on an empty board.
 */
const requirejs = require('requirejs');

requirejs.config({
	baseUrl: "..",
    nodeRequire: require,
	paths: {
		game: "js/game",
		dawg: "js/dawg",
		platform: "js/server"
	}
});

requirejs(["test/TestRunner", "game/Edition", "game/Tile", "game/Player", "game/Game", "game/Rack", "game/findBestPlay"], (TestRunner, Edition, Tile, Player, Game, Rack, findBestPlay) => {
    let tr = new TestRunner("first play");
    let assert = tr.assert;

	tr.addTest("first play English Scrabble", () => {
		let player = new Player("test", 7);
		let game = new Game("English_Scrabble", [ player ], "SOWPODS_English");
		game.load()
		.then(() => {
			game.board.parse("| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n");
			let bestPlay;
			return findBestPlay(
				game, new Rack(
					[
						new Tile('A', false, 1),
						new Tile('E', false, 1),
						new Tile('I', false, 1),
						new Tile('O', false, 1),
						new Tile('U', false, 1),
						new Tile(' ', true, 0),
						new Tile(' ', true, 0)
					]).tiles(),
				play => {
					console.log(play);
					bestPlay = play;
				})
			.then(() => {
				assert.equal(bestPlay.words[0].word, "DOULEIA");
				assert.equal(bestPlay.words[0].score, 62);
				let tile = bestPlay.placements[0];
				assert(tile instanceof Tile);
				assert.equal(tile.letter, 'D');
				assert.equal(tile.score, 0);
				assert(tile.isblank);
				if (tile.col === 1)
					assert.equal(tile.row, 7);
				else {
					assert.equal(tile.col, 7);
					assert.equal(tile.row, 1);
				}
			});
		});
	});

	tr.addTest("first play English WWF", () => {
		let player = new Player("test", 7);
		let game = new Game("English_WWF", [ player ], "SOWPODS_English");
		game.load()
		.then(() => {
			game.board.parse("| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n" +
							 "| | | | | | | | | | | | | | | |\n");

			let bestPlay;
			return findBestPlay(
				game, new Rack([
					new Tile('Z', false, 1),
					new Tile('E', false, 1),
					new Tile('B', false, 1),
					new Tile('U', false, 1)
				]).tiles(),
				play => bestPlay = play)
			.then(() => {
				assert.equal(bestPlay.words[0].word, "ZEBU");
				assert.equal(bestPlay.words[0].score, 8);
			});
		});
	});

	tr.run();
});

