/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env node */

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

requirejs(["test/TestRunner", "game/Edition", "game/Tile", "game/Rack", "game/Player", "game/Game", "game/Move", "game/Turn", "game/findBestPlay"], (TestRunner, Edition, Tile, Rack, Player, Game, Move, Turn, findBestPlay) => {
    let tr = new TestRunner("Game");
    let assert = tr.assert;

	tr.addTest("autoplay", () => {
		return new Game("English_Scrabble", "Oxford_5000").create()
		.then(game => {
			let player = new Player("test", true);
			game.addPlayer(player);
			// Override the random rack
			player.rack.empty();
			player.rack.addTile(new Tile("I", false, 1));
			player.rack.addTile(new Tile(null, true, 0));
			return game.autoplay(player);
		})

		.then(() => new Game("Tiny", "Oxford_5000").create())
		.then(game => {
			player = new Player("test", true);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile("A", false, 1));
			player.rack.addTile(new Tile("B", false, 1));
			player.rack.addTile(new Tile("C", false, 1));
			player.rack.addTile(new Tile("D", false, 1));
			return game.autoplay(player);
		})

		.then(() => new Game("Tiny", "SOWPODS_English").create())
		.then(game => {
			player = new Player("test", true);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile(' ', true, 1));
			player.rack.addTile(new Tile(undefined, true, 1));
			player.rack.addTile(new Tile(null, true, 1));
			return game.autoplay(player);
		});
	});
	
	tr.addTest("swap", () => {
		return new Game("Tiny", "Oxford_5000").create()
		.then(game => {
			const player = new Player("test1", false);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile('A', false, 1));
			player.rack.addTile(new Tile('B', false, 1));
			player.rack.addTile(new Tile('C', false, 1));
			player.rack.addTile(new Tile('D', false, 1));
			player.rack.addTile(new Tile('E', false, 1));
			game.addPlayer(new Player("test2", false));
			// Leave 5 tiles in the bag - enough to swap
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount() - 5);
			return game.loadBoard("| | | | | | | | | | | |\n" +
								  "| | | | | | | | | | | |\n" +
								  "| | | | | | | | | | | |\n" +
								  "| | | | | | | | | | | |\n" +
								  "| | | | | | | | | | | |\n" +
								  "| | | | | | | | | | | |\n" +
								  "| | | | | | | | | | | |\n" +
								  "| | | | | | | | | | | |\n" +
								  "| | | | | | | | | | | |\n" +
								  "| | | | | | | | | | | |\n" +
								  "| | | | | | | | | | | |\n");
		})
		.then(game => game.swap([
			new Tile('A', false, 1),
			new Tile('C', false, 1),
			new Tile('E', false, 1)
		]))
		.then(turn => {
			//console.log("TURN", turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, "swap");
			assert.equal(turn.player, 0);
			assert.equal(turn.deltaScore, 0);
			assert.equal(turn.nextToGo, 1);
			assert.equal(turn.leftInBag, 5);
			assert.equal(turn.onRacks[0], 5);
			assert.equal(turn.onRacks[1], 5);
			let newt = turn.newTiles;
			assert.equal(3, newt.length);
		});
	});

	tr.addTest("makeMove", () => {
		return new Game("Tiny", "Oxford_5000").create()
		.then(game => {
			const player = new Player("test1", false);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile('W', false, 1));
			player.rack.addTile(new Tile('O', false, 1));
			player.rack.addTile(new Tile('R', false, 1));
			player.rack.addTile(new Tile('D', false, 1));
			player.rack.addTile(new Tile('X', false, 1));
			game.addPlayer(new Player("test2", false));
			// Leave 3 tiles in the bag - not enough to refill the rack
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount() - 3);
			return game.makeMove(
				new Move(
					[
						new Tile('W', false, 1, 7, 7),
						new Tile('O', false, 1, 8, 7),
						new Tile('R', false, 1, 9, 7),
						new Tile('D', false, 1, 10, 7) ],
					[ { word: "WORD", score: 99 }],
					99));
		})
		.then(turn => {
			console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, "move");
			assert.equal(turn.player, 0);
			assert.equal(turn.deltaScore, 99);
			assert.equal(turn.nextToGo, 1);
			assert.equal(turn.leftInBag, 0);
			assert.equal(turn.onRacks[0], 4);
			assert.equal(turn.onRacks[1], 5);
			assert(turn.move instanceof Move);
			let newt = turn.newTiles;
			assert.equal(3, newt.length);
		});
	});

	tr.addTest("badChallenge", () => {
		// Implicitly tests pass
		const game = new Game("Tiny", "Oxford_5000");
		return game.create()
		.then(game => {
			game.addPlayer(new Player("test1", true));
			game.addPlayer(new Player("test2", true));
			return game.autoplay(game.players[game.whosTurn]);
		})
		.then(() => game.challenge())
		.then(turn => {
			console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, "challenge-failed");
			assert.equal(turn.player, 1);
			assert.equal(turn.deltaScore, 0);
			assert.equal(turn.nextToGo, 0);
		});
	});

	tr.addTest("goodChallenge", () => {
		// Implicitly tests takeBack
		const game = new Game("Tiny", "Oxford_5000");
		return game.create()
		.then(() => {
			const player = new Player("test1", true);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile('X', false, 1));
			player.rack.addTile(new Tile('Y', false, 1));
			player.rack.addTile(new Tile('Z', false, 1));
			player.rack.addTile(new Tile('Z', false, 1));
			player.rack.addTile(new Tile('Y', false, 1));
			game.addPlayer(new Player("test2", true));
			return game.makeMove(
				new Move(
					[
						new Tile('X', false, 1, 7, 7),
						new Tile('Y', false, 1, 8, 7),
						new Tile('Z', false, 1, 9, 7),
						new Tile('Z', false, 1, 10, 7) ],
					[ { word: "XYZZ", score: 99 }],
					99));
		})
		.then(() => game.challenge())
		.then(turn => {
			//console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, "challenge-won");
			assert.equal(turn.player, 0);
			assert.equal(turn.challenger, 1);
			assert.equal(turn.deltaScore, -99);
			assert.equal(turn.nextToGo, 1);
		});
	});

	tr.run();
});

