/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env node */

const requirejs = require('requirejs');

requirejs.config({
	baseUrl: '..',
    nodeRequire: require,
	paths: {
		game: 'js/game',
		dawg: 'js/dawg',
		platform: 'js/server/ServerPlatform'
	}
});

requirejs(['test/TestRunner', 'game/Edition', 'game/Tile', 'game/Rack', 'game/Player', 'game/Game', 'game/Move', 'game/findBestPlay'], (TestRunner, Edition, Tile, Rack, Player, Game, Move, findBestPlay) => {
    let tr = new TestRunner('best move from complex boards');
    let assert = tr.assert;

	tr.addTest('blanks', () => {
		let bestMoves = [];
		return new Game('English_WWF', 'Oxford_5000').create()
		.then(game => {
			game.addPlayer(new Player('test', true));
			return game.loadBoard(
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| |S|E|N|S|O|R|Y| | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n');
		})
		.then(game => findBestPlay(
			game, [
				new Tile({letter:'E', isBlank:false, score:1}),
				new Tile({letter:'I', isBlank:false, score:1}),
				new Tile({letter:'I', isBlank:false, score:1}),
				new Tile({letter:'Y', isBlank:false, score:1}),
				new Tile({letter:'A', isBlank:false, score:1}),
				new Tile({letter:'H', isBlank:false, score:1}),
				new Tile({letter:' ', isBlank:true, score:0}),
				new Tile({letter:' ', isBlank:true, score:0})
			],
			move => {
				//console.log(move);
				if (move instanceof Move)
					bestMoves.push(move);
			}))
		.then(() => {
			assert.equal(bestMoves.length, 8);
			assert.equal(bestMoves[7].words.length, 1);
			assert.equal(bestMoves[7].words[0].word, 'HAIRIEST');
			assert.equal(bestMoves[7].score, 47);
		});
	});

	tr.addTest('actor', () => {
		let bestMoves = [];
		return new Game('English_WWF', 'SOWPODS_English').create()
		.then(game => {
			game.addPlayer(new Player('test', true));
			return game.loadBoard(
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | |G| | | | | | | | | | |\n' +
				'| | | |C|R|A| | | | | | | | | |\n' +
				'| | | |T|O| | | | | | | | | | |\n' +
				'| | | |S|T|E|P| | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n');
		})
		.then(game => findBestPlay(
			game, new Rack([
				new Tile({letter:'A', isBlank:false, score:1}),
				new Tile({letter:'C', isBlank:false, score:3}),
				new Tile({letter:'R', isBlank:false, score:1})
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
			assert.equal(last.words[0].word, 'ACTS');
			assert.equal(last.words[0].score, 8);
			assert.equal(last.words[1].word, 'CRAG');
			assert.equal(last.words[1].score, 9);
			assert.equal(last.score, 17);
			assert.equal(last.placements.length, 3);
			assert(last.placements[0] instanceof Tile);
			assert.equal(last.placements[0].letter, 'C');
			assert.equal(last.placements[0].score, 3);
			assert.equal(last.placements[0].col, 2);
			assert.equal(last.placements[0].row, 6);
			assert.equal(last.placements[1].letter, 'R');
			assert.equal(last.placements[1].score, 1);
			assert.equal(last.placements[1].col, 3);
			assert.equal(last.placements[1].row, 6);			
			assert.equal(last.placements[2].letter, 'A');
			assert.equal(last.placements[2].score, 1);
			assert.equal(last.placements[2].col, 4);
			assert.equal(last.placements[2].row, 6);			
		});
	});

	tr.addTest('noe', () => {
		let bestMoves = [];
		return new Game('English_Scrabble', 'SOWPODS_English').create()
		.then(game => {
			game.addPlayer(new Player('test', true));
			return game.loadBoard(
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | |P| | | | | | | | | |\n' +
				'| | | | |T|A|X|I| | | | | | | |\n' +
				'| | | | |O|N| | | | | | | | | |\n' +
				'| | | | |W| | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n');
		})
		
		.then(game => findBestPlay(
			game, new Rack([
				new Tile({letter:'L', isBlank:false, score:1}),
				new Tile({letter:'I', isBlank:false, score:1}),
				new Tile({letter:'G', isBlank:false, score:2}),
				new Tile({letter:'E', isBlank:false, score:1}),
				new Tile({letter:'B', isBlank:false, score:3}),
				new Tile({letter:'A', isBlank:false, score:1}),
				new Tile({letter:'A', isBlank:false, score:1})
			]).tiles(),
			move => {
				//console.log(move);
				if (move instanceof Move)
					bestMoves.push(move);
			}))

		.then(() => {
			assert.equal(bestMoves.length, 6);
			
			assert.equal(bestMoves[0].words.length, 1);
			assert.equal(bestMoves[0].words[0].word, 'ATAXIA');
			assert.equal(bestMoves[0].words[0].score, 13);

			assert.equal(bestMoves[1].words.length, 1);
			assert.equal(bestMoves[1].words[0].word, 'TOWABLE');
			assert.equal(bestMoves[1].words[0].score, 14);

			assert.equal(bestMoves[5].words.length, 3);
			assert.equal(bestMoves[5].score, 27);
			assert.equal(bestMoves[5].words[0].word, 'EX');
			assert.equal(bestMoves[5].words[0].score, 9);
		});
	});
	
	tr.addTest('town', () => {
		let bestMoves = [];
		return new Game('English_Scrabble', 'Oxford_5000').create()
		.then(game => {
			game.addPlayer(new Player('test', true));
			return game.loadBoard(
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n' +
				'| | | | | |B|E|L|O|W| | | | | |\n' +
				'| | | | | | | |A| | | | | | | |\n' +
				'| | | | |A|T|A|X|I|C| | | | | |\n' +
				'| | | | | |O| | | | | | | | | |\n' +
				'| | | | | |W|H|I|P|S| | | | | |\n' +
				'| | | | | | | |T| |O| | | | | |\n' +
				'| | | | | | | |A| |U| | | | | |\n' +
				'| | | | | | | |L| |N| | | | | |\n' +
				'| | | | | | | |I| |D| | | | | |\n' +
				'| | | | | | | |C| | | | | | | |\n' +
				'| | | | | | | | | | | | | | | |\n');
		})
		.then(game => findBestPlay(
			game, new Rack([
				new Tile({letter:'U', isBlank:false, score:1}),
				new Tile({letter:'T', isBlank:false, score:1}),
				new Tile({letter:'R', isBlank:false, score:1}),
				new Tile({letter:'N', isBlank:false, score:1}),
				new Tile({letter:'M', isBlank:false, score:3}),
				new Tile({letter:'K', isBlank:false, score:5}),
				new Tile({letter:'I', isBlank:false, score:1})
			]).tiles(),
			move => {
				//console.log(move);
				if (move instanceof Move)
					bestMoves.push(move);
			}))
		.then(() => {
			const last = bestMoves[bestMoves.length - 1];
			assert.equal(last.words.length, 1);
			assert.equal(last.words[0].word, 'TRICK');
			assert.equal(last.words[0].score, 33);
		});
	});

	tr.run();
});

