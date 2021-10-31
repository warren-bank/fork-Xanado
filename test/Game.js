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

requirejs(['test/TestRunner', 'game/Edition', 'game/Tile', 'game/Rack', 'game/Player', 'game/Game', 'game/Move', 'game/Turn', 'game/findBestPlay'], (TestRunner, Edition, Tile, Rack, Player, Game, Move, Turn, findBestPlay) => {
    let tr = new TestRunner('Game');
    let assert = tr.assert;

	tr.addTest('basics', () => {
		return new Game('English_Scrabble', 'Oxford_5000').create()
		.then(game => {
			const player1 = new Player('player1', true);
			game.addPlayer(player1);
			const player2 = new Player('player2', false);
			game.addPlayer(player2);
			const player3 = new Player('player3', false);
			game.addPlayer(player3);

			player3.rack.empty();
			player1.score = 1;
			player2.score = 2;
			player3.score = 3;

			let player = game.getPlayer();
			assert.equal(player.index, 0);
			player = game.getPlayer(1);
			assert.equal(player.index, 1);
			assert.equal(game.nextPlayer(2), 0);
			assert.equal(game.previousPlayer(0), 2);
			assert.equal(game.nextPlayer(), 1);
			assert.equal(game.previousPlayer(), 2);
			assert.equal(game.winningScore(), 3);
			assert.equal(game.getPlayerWithNoTiles().index, 2);
		});
	});

	tr.addTest('autoplay', () => {
		return new Game('English_Scrabble', 'Oxford_5000').create()
		.then(game => {
			let player = new Player('test', true);
			game.addPlayer(player);
			// Override the random rack
			player.rack.empty();
			player.rack.addTile(new Tile({letter:'I', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:null, isBlank:true, score:0}));
			return game.autoplay(player);
		})

		.then(() => new Game('Tiny', 'Oxford_5000').create())
		.then(game => {
			let player = new Player('test', true);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile({letter:'A', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'B', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'C', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'D', isBlank:false, score:1}));
			return game.autoplay(player);
		})

		.then(() => new Game('Tiny', 'SOWPODS_English').create())
		.then(game => {
			let player = new Player('test', true);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile({letter:' ', isBlank:true, score:1}));
			player.rack.addTile(new Tile({letter:undefined, isBlank:true, score:1}));
			player.rack.addTile(new Tile({letter:null, isBlank:true, score:1}));
			return game.autoplay(player);
		});
	});
	
	tr.addTest('swap', () => {
		return new Game('Tiny', 'Oxford_5000').create()
		.then(game => {
			const player = new Player('test1', false);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile({letter:'A', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'B', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'C', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'D', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'E', isBlank:false, score:1}));
			game.addPlayer(new Player('test2', false));
			// Leave 5 tiles in the bag - enough to swap
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount() - 5);
			return game.loadBoard('| | | | | | | | | | | |\n' +
								  '| | | | | | | | | | | |\n' +
								  '| | | | | | | | | | | |\n' +
								  '| | | | | | | | | | | |\n' +
								  '| | | | | | | | | | | |\n' +
								  '| | | | | | | | | | | |\n' +
								  '| | | | | | | | | | | |\n' +
								  '| | | | | | | | | | | |\n' +
								  '| | | | | | | | | | | |\n' +
								  '| | | | | | | | | | | |\n' +
								  '| | | | | | | | | | | |\n');
		})
		.then(game => game.swap([
			new Tile({letter:'A', isBlank:false, score:1}),
			new Tile({letter:'C', isBlank:false, score:1}),
			new Tile({letter:'E', isBlank:false, score:1})
		]))
		.then(turn => {
			//console.log('TURN', turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'swap');
			assert.equal(turn.player, 0);
			assert.equal(turn.leftInBag, 5);
			console.log(turn);
			let newt = turn.move.replacements;
			assert.equal(3, newt.length);
		});
	});

	tr.addTest('makeMove', () => {
		const W = new Tile({letter:'W', isBlank:false, score:1, col: 7, row: 7});
		const O = new Tile({letter:'O', isBlank:false, score:1, col: 8, row: 7});
		const R = new Tile({letter:'R', isBlank:false, score:1, col: 9, row: 7});
		const D = new Tile({letter:'D', isBlank:false, score:1, col: 10, row: 7});
		const move = new Move({
			placements: [ W, O, R, D ],
			words: [ { word: 'WORD', score: 99 }],
			score: 99
		});
		return new Game('Tiny', 'Oxford_5000').create()
		.then(game => {
			const player = new Player('test1', false);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile({letter:'W', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'O', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'R', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'D', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'X', isBlank:false, score:1}));
			game.addPlayer(new Player('test2', false));
			// Leave 3 tiles in the bag - not enough to refill the rack
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount() - 3);
			return game.makeMove(move);
		})
		.then(turn => {
			console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'move');
			assert.equal(turn.player, 0);
			assert.equal(turn.nextToGo, 1);
			assert.equal(turn.deltaScore, 99);
			assert.equal(turn.leftInBag, 0);
			assert.deepEqual(turn.move, move);
			let newt = turn.move.replacements;
			assert.equal(3, newt.length);
		});
	});

	tr.addTest('lastMove', () => {
		return new Game('Tiny', 'Oxford_5000').create()
		.then(game => {
			const player = new Player('test1', false);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile({letter:'W', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'O', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'R', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'D', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'X', isBlank:false, score:1}));
			game.addPlayer(new Player('test2', false));
			// Empty the bag
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount());
			return game.makeMove(
				new Move({
					placements: [
						new Tile({letter:'X', isBlank:false, score:1, col: 6, row: 7}),
						new Tile({letter:'W', isBlank:false, score:1, col: 7, row: 7}),
						new Tile({letter:'O', isBlank:false, score:1, col: 8, row: 7}),
						new Tile({letter:'R', isBlank:false, score:1, col: 9, row: 7}),
						new Tile({letter:'D', isBlank:false, score:1, col: 10, row: 7})
					],
					words: [ { word: 'XWORD', score: 99 }],
					score: 99
				}));
		})
		.then(turn => {
			console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'move');
			assert.equal(turn.player, 0);
			assert.equal(turn.nextToGo, 1);
			assert.equal(turn.deltaScore, 99);
			assert.equal(turn.leftInBag, 0);
			assert(turn.move instanceof Move);
			let newt = turn.move.replacements;
			assert.equal(0, newt.length);
		});
	});

	tr.addTest('confirm', () => {
		return new Game('Tiny', 'Oxford_5000').create()
		.then(game => {
			const player = new Player('test1', false);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile({letter:'X', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'Y', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'Z', isBlank:false, score:1}));
			const player2 = new Player('test2', false);
			game.addPlayer(player2);
			player2.rack.empty();
			// Empty the bag
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount());
			return game.confirmGameOver('ended-game-over');
		})
		.then(turn => {
			console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'ended-game-over');
			assert.equal(turn.player, 0);
			assert.equal(turn.deltaScore[0], -3);
			assert.equal(turn.deltaScore[1], 3);
			assert.equal(turn.leftInBag, 0);
		});
	});

	tr.addTest('badChallenge', () => {
		// Implicitly tests pass
		const game = new Game('Tiny', 'Oxford_5000');
		return game.create()
		.then(game => {
			game.addPlayer(new Player('test1', true));
			game.addPlayer(new Player('test2', true));
			return game.autoplay(game.players[game.whosTurn]);
		})
		.then(() => game.challenge())
		.then(turn => {
			console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'challenge-failed');
			assert.equal(turn.player, 1);
			assert.equal(turn.nextToGo, 0);
		});
	});

	tr.addTest('goodChallenge', () => {
		const game = new Game('Tiny', 'Oxford_5000');
		return game.create()
		.then(() => {
			const player = new Player('test1', true);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile({letter:'X', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'Y', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'Z', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'Z', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'Y', isBlank:false, score:1}));
			game.addPlayer(new Player('test2', true));
			return game.makeMove(
				new Move({
					placements: [
						new Tile({letter:'X', isBlank:false, score:1, col: 7, row: 7}),
						new Tile({letter:'Y', isBlank:false, score:1, col: 8, row: 7}),
						new Tile({letter:'Z', isBlank:false, score:1, col: 9, row: 7}),
						new Tile({letter:'Z', isBlank:false, score:1, col: 10, row: 7}) ],
					words: [ { word: 'XYZZ', score: 99 }],
					score: 99
				}));
		})
		.then(() => game.challenge())
		.then(turn => {
			//console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'challenge-won');
			assert.equal(turn.player, 0);
			assert.equal(turn.nextToGo, 1);
			assert.equal(turn.challenger, 1);
			assert.equal(turn.deltaScore, -99);
		});
	});

	tr.addTest('takeBack', () => {
		const game = new Game('Tiny', 'Oxford_5000');
		return game.create()
		.then(() => {
			const player = new Player('test1', true);
			game.addPlayer(player);
			player.rack.empty();
			player.rack.addTile(new Tile({letter:'X', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'Y', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'Z', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'Z', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'Y', isBlank:false, score:1}));
			game.addPlayer(new Player('test2', true));
			// Player 0 makes a move
			return game.makeMove(
				new Move({
					placements: [
						new Tile({letter:'X', isBlank:false, score:1, col: 7, row: 7}),
						new Tile({letter:'Y', isBlank:false, score:1, col: 8, row: 7}),
						new Tile({letter:'Z', isBlank:false, score:1, col: 10, row: 7}) ],
					words: [ { word: 'XYZ', score: 3 }],
					score: 3
				}));
		})
		// Player 0 takes their move back
		.then(() => game.takeBack('took-back'))
		.then(turn => {
			//console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'take-back');
			assert.equal(turn.player, 0);
			assert.equal(turn.nextToGo, 0);
			assert.equal(turn.challenger, 1);
			assert.equal(turn.deltaScore, -99);
		});
	});

	tr.addTest('challengeLastMoveGood', () => {
		const game = new Game('Tiny', 'Oxford_5000');
		const player1 = new Player('test1', false);
		const player2 = new Player('test2', false);

		return game.create()
		.then(game => {
			game.addPlayer(player1);
			player1.rack.empty();
			player1.rack.addTile(new Tile({letter:'X', isBlank:false, score:1}));
			player1.rack.addTile(new Tile({letter:'Y', isBlank:false, score:1}));
			player1.rack.addTile(new Tile({letter:'Z', isBlank:false, score:1}));
			game.addPlayer(player2);

			// Empty the bag
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount());

			return game.makeMove(
				new Move({
					placements: [
						new Tile({letter:'X', isBlank:false, score:1, col: 6, row: 7}),
						new Tile({letter:'Y', isBlank:false, score:1, col: 7, row: 7}),
						new Tile({letter:'Z', isBlank:false, score:1, col: 8, row: 7}),
					],
					words: [ { word: 'XYZ', score: 3 }],
					score: 3
				}));
		})
		// Player 0 has played, so issue a challenge on behalf of player 2
		.then(() => game.challenge())
		.then(turn => {
			console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'challenge-won');
			assert.equal(turn.player, 0);
			assert.equal(turn.nextToGo, 1);
			assert.equal(turn.leftInBag, 0);
			assert.equal(turn.deltaScore, -3);
			assert.equal(0, turn.move.replacements.length);
			assert.equal(1, turn.challenger);
			assert(!turn.emptyPlayer);
		});
	});

	tr.addTest('challengeLastMoveBad', () => {
		const game = new Game('Tiny', 'Oxford_5000');
		const player1 = new Player('test1', false);
		const player2 = new Player('test2', false);

		return game.create()
		.then(game => {
			game.addPlayer(player1);
			player1.rack.empty();
			player1.rack.addTile(new Tile({letter:'A', isBlank:false, score:1}));
			player1.rack.addTile(new Tile({letter:'R', isBlank:false, score:1}));
			player1.rack.addTile(new Tile({letter:'T', isBlank:false, score:1}));
			game.addPlayer(player2);

			// Empty the bag
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount());

			return game.makeMove(
				new Move({
					placements: [
						new Tile({letter:'A', isBlank:false, score:1, col: 6, row: 7}),
						new Tile({letter:'R', isBlank:false, score:1, col: 7, row: 7}),
						new Tile({letter:'T', isBlank:false, score:1, col: 8, row: 7}),
					],
					words: [ { word: 'ART', score: 3 }],
					score: 3
				}));
		})
		// Player 0 has played, so issue a challenge on behalf of player 1
		.then(() => game.challenge())
		.then(turn => {
			console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'challenge-failed');
			assert.equal(turn.player, 1);
			assert.equal(turn.nextToGo, 0);
			assert.equal(turn.leftInBag, 0);
			// Still empty!
			assert.equal(turn.emptyPlayer, 0);
		});
	});


	tr.run();
});

