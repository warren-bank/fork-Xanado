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
		triggerEvent: "js/server/triggerEvent"
	}
});

requirejs(["test/TestRunner", "game/Edition", "game/Tile", "game/Rack", "game/Player", "game/Game", "game/Move", "game/findBestPlay"], (TestRunner, Edition, Tile, Rack, Player, Game, Move, findBestPlay) => {
    let tr = new TestRunner("first play");
    let assert = tr.assert;

	tr.deTest("tiny", () => {
		let player = new Player("test", 7);
		let game = new Game("English_Scrabble", [ player ], "Custom_English");
		return game.load()
		.then(() => {
			player.rack.empty();
			player.rack.squares[0].placeTile(new Tile("I", false, 1));
			player.rack.squares[1].placeTile(new Tile(null, true, 0));
		
			return player.autoplay(game);
		})
		.then(() => {
			let player = new Player("test", 5);
			return new Game("Tiny", [ player ], "Custom_English").load();
		})
		.then(game => {
			player.rack.empty();
			player.rack.squares[0].placeTile(new Tile("A", false, 1));
			player.rack.squares[1].placeTile(new Tile("B", false, 1));
			player.rack.squares[2].placeTile(new Tile("C", false, 1));
			player.rack.squares[3].placeTile(new Tile("D", false, 1));
			
			return player.autoplay(game);
		})
		.then(() => {
			let player = new Player("test", 5);
			return new Game("Tiny", [ player ], "SOWPODS_English").load();
		})
		.then(game => {
			player.rack.empty();
			player.rack.squares[0].placeTile(new Tile(' ', true, 1));
			player.rack.squares[1].placeTile(new Tile(undefined, true, 1));
			player.rack.squares[2].placeTile(new Tile(null, true, 1));
		
			return player.autoplay(game);
		})
		.then(() => {
			let player = new Player("test", 5);
			return new Game("Tiny", [ player ], "SOWPODS_English").load();
		})

	});
	
	tr.deTest("blanks", () => {
		let player = new Player("test", 8);
		let game = new Game("English_WWF", [ player ], "Custom_English");
		let bestMoves = [];
		game.load()
		.then(() =>
			game.loadBoard("| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| |S|E|N|S|O|R|Y| | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n"))
		.then(() => findBestPlay(
			game, [
				new Tile('E', false, 1),
				new Tile('I', false, 1),
				new Tile('I', false, 1),
				new Tile('Y', false, 1),
				new Tile('A', false, 1),
				new Tile('H', false, 1),
				new Tile(' ', true, 0),
				new Tile(' ', true, 0)
			],
			move => {
				if (move instanceof Move)
					bestMoves.push(move);
				//else
				//	console.log(move);
			}))
		.then(() => {
			assert.equals(bestMoves.length, 4);
			assert.equal(bestMoves[0].words.length, 1);
			assert.equal(bestMoves[0].words[0].word, "ABASE");
			assert.equal(bestMoves[0].words[0].score, 6);
			assert.equal(bestMoves[1].words.length, 1);
			assert.equal(bestMoves[1].words[0].word, "ACHIEST");
			assert.equal(bestMoves[1].words[0].score, 12);
			assert.equal(bestMoves[2].words.length, 1);
			assert.equal(bestMoves[2].words[0].word, "AIRSHIP");
			assert.equal(bestMoves[2].words[0].score, 20);
			assert.equal(bestMoves[3].words.length, 1);
			assert.equal(bestMoves[3].words[0].word, "HYSTERIA");
			assert.equal(bestMoves[3].words[0].score, 28);
		});
	});

	tr.deTest("actor", () => {
		let player = new Player("test", 8);
		let game = new Game("English_Scrabble", [ player ], "SOWPODS_English");
		let bestMoves = [];
		game.load()
		.then(() =>
			game.loadBoard("| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | |G| | | | | | | | | | |\n" +
						   "| | | |C|R|A| | | | | | | | | |\n" +
						   "| | | |T|O| | | | | | | | | | |\n" +
						   "| | | |S|T|E|P| | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n"))
		.then(() => findBestPlay(
			game, new Rack([
				new Tile('A', false, 1),
				new Tile('C', false, 3),
				new Tile('R', false, 1)
			]).tiles(),
			move => {
				//console.log(move);
				if (move instanceof Move)
					bestMoves.push(move);
			}))
		.then(() => {
			assert.equals(bestMoves.length, 4);
			const last = bestMoves[3];
			assert.equal(last.words.length, 2);
			assert.equal(last.words[0].word, "ACTS");
			assert.equal(last.words[0].score, 6);
			assert.equal(last.words[1].word, "CAG");
			assert.equal(last.words[1].score, 9);
			assert.equal(last.score, 15);
			assert(last.placements[0] instanceof Tile);
			assert.equal(last.placements[0].letter, 'C');
			assert.equal(last.placements[0].score, 3);
			assert.equal(last.placements[0].col, 2);
			assert.equal(last.placements[0].row, 6);
			assert.equal(last.placements[1].letter, 'A');
			assert.equal(last.placements[1].score, 1);
			assert.equal(last.placements[0].col, 3);
			assert.equal(last.placements[0].row, 6);			
		});
	});

	tr.deTest("noe", () => {
		let player = new Player("test", 8);
		let game = new Game("English_Scrabble", [ player ], "SOWPODS_English");
		let bestMoves = [];
		game.load()
		.then(() =>
			game.loadBoard("| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | |P| | | | | | | | | |\n" +
						   "| | | | |T|A|X|I| | | | | | | |\n" +
						   "| | | | |O|N| | | | | | | | | |\n" +
						   "| | | | |W| | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n" +
						   "| | | | | | | | | | | | | | | |\n"))
		.then(() => findBestPlay(
			game, new Rack([
				new Tile('L', false, 1),
				new Tile('I', false, 1),
				new Tile('G', false, 2),
				new Tile('E', false, 1),
				new Tile('B', false, 3),
				new Tile('A', false, 1),
				new Tile('A', false, 1)
			]).tiles(),
			move => {
				if (move instanceof Move)
					bestMoves.push(move);
				else
					console.log(move);
			}))
		.then(() => {
			assert.equals(bestMoves.length, 2);
			assert.equal(bestMoves[0].words.length, 1);
			assert.equal(bestMoves[0].words[0].word, "ATAXIA");
			assert.equal(bestMoves[0].words[0].score, 14);
			assert.equal(bestMoves[1].words.length, 1);
			assert.equal(bestMoves[1].words[0].word, "TOWABLE");
			assert.equal(bestMoves[1].words[0].score, 24);
		});
	});
	
	tr.addTest("town", () => {
		let player = new Player("test", 7);
		let game = new Game("English_Scrabble", [ player ], "Custom_English");
		let bestMoves = [];
		game.load()
		.then(() =>
			  game.loadBoard(
				  "| | | | | | | | | | | | | | | |\n" +
				  "| | | | | | | | | | | | | | | |\n" +
				  "| | | | | | | | | | | | | | | |\n" +
				  "| | | | | | | | | | | | | | | |\n" +
				  "| | | | | | | | | | | | | | | |\n" +
				  "| | | | | |B|E|L|O|W| | | | | |\n" +
				  "| | | | | | | |A| | | | | | | |\n" +
				  "| | | | |A|T|A|X|I|C| | | | | |\n" +
				  "| | | | | |O| | | | | | | | | |\n" +
				  "| | | | | |W|H|I|P|S| | | | | |\n" +
				  "| | | | | | | |T| |O| | | | | |\n" +
				  "| | | | | | | |A| |U| | | | | |\n" +
				  "| | | | | | | |L| |N| | | | | |\n" +
				  "| | | | | | | |I| |D| | | | | |\n" +
				  "| | | | | | | |C| | | | | | | |\n" +
				  "| | | | | | | | | | | | | | | |\n"))
		.then(() => findBestPlay(
			game, new Rack([
				new Tile('U', false, 1),
				new Tile('T', false, 1),
				new Tile('R', false, 1),
				new Tile('N', false, 1),
				new Tile('M', false, 3),
				new Tile('K', false, 5),
				new Tile('I', false, 1)
			]).tiles(),
			move => {
				console.log(move);
				if (move instanceof Move)
					bestMoves.push(move);
			}))
		.then(() => {
			console.log("town finished");
		});
	});

	tr.run();
});

