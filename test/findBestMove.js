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

requirejs(["test/TestRunner", "game/Edition", "game/Tile", "game/Rack", "game/Player", "game/Game", "game/Move", "game/findBestPlay"], (TestRunner, Edition, Tile, Rack, Player, Game, Move, findBestPlay) => {
    let tr = new TestRunner("best move from complex boards");
    let assert = tr.assert;

	tr.addTest("blanks", () => {
		let bestMoves = [];
		return new Game("English_WWF", "Custom_English").create()
		.then(game => {
			game.addPlayer(new Player("test", true));
			return game.loadBoard(
				"| | | | | | | | | | | | | | | |\n" +
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
				"| | | | | | | | | | | | | | | |\n");
		})
		.then(game => findBestPlay(
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
			assert.equal(bestMoves.length, 4);
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

	tr.addTest("actor", () => {
		let bestMoves = [];
		return new Game("English_Scrabble", "SOWPODS_English").create()
		.then(game => {
			game.addPlayer(new Player("test", true));
			return game.loadBoard(
				"| | | | | | | | | | | | | | | |\n" +
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
				"| | | | | | | | | | | | | | | |\n");
		})
		.then(game => findBestPlay(
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
			assert.equal(bestMoves.length, 3);
			const last = bestMoves[2];
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
			assert.equal(last.placements[1].col, 3);
			assert.equal(last.placements[1].row, 6);			
		});
	});

	tr.addTest("noe", () => {
		let bestMoves = [];
		return new Game("English_Scrabble", "SOWPODS_English").create()
		.then(game => {
			game.addPlayer(new Player("test", true));
			return game.loadBoard(
				"| | | | | | | | | | | | | | | |\n" +
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
				"| | | | | | | | | | | | | | | |\n");
		})
		
		.then(game => findBestPlay(
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
				//else
				//	console.log(move);
			}))

		.then(() => {
			assert.equal(bestMoves.length, 2);
			assert.equal(bestMoves[0].words.length, 1);
			assert.equal(bestMoves[0].words[0].word, "ATAXIA");
			assert.equal(bestMoves[0].words[0].score, 14);
			assert.equal(bestMoves[1].words.length, 1);
			assert.equal(bestMoves[1].words[0].word, "TOWABLE");
			assert.equal(bestMoves[1].words[0].score, 24);
		});
	});
	
	tr.addTest("town", () => {
		let bestMoves = [];
		return new Game("English_Scrabble", "Custom_English").create()
		.then(game => {
			game.addPlayer(new Player("test", true));
			return game.loadBoard(
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
				"| | | | | | | | | | | | | | | |\n");
		})
		.then(game => findBestPlay(
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
				//console.log(move);
				if (move instanceof Move)
					bestMoves.push(move);
			}))
		.then(() => {
			const last = bestMoves[bestMoves.length - 1];
			assert.equal(last.words.length, 3);
			assert.equal(last.words[0].word, "TOWN");
			assert.equal(last.words[0].score, 7);
			assert.equal(last.words[1].word, "HI");
			assert.equal(last.words[1].score, 5);
			assert.equal(last.words[2].word, "KNIT");
			assert.equal(last.words[2].score, 16);
		});
	});

	tr.run();
});

