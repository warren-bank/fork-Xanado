/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env node */

const requirejs = require('requirejs');
const NOISY = false;

requirejs.config({
	baseUrl: '..',
    nodeRequire: require,
	paths: {
		game: 'js/game',
		dawg: 'js/dawg',
		platform: 'js/server/ServerPlatform'
	}
});

class PSocket {
	constructor() {
		this.player = undefined;
		this.messages = [];
	}

	emit(message, data) {
		this.messages.push({ message: message, data: data});
	}

	on(event, listener) {
	}
}

requirejs(['test/TestRunner', 'game/Edition', 'game/Tile', 'game/Rack', 'game/Player', 'game/Game', 'game/Move', 'game/Turn', 'game/findBestPlay'], (TestRunner, Edition, Tile, Rack, Player, Game, Move, Turn, findBestPlay) => {
    let tr = new TestRunner('Game tests');
    let assert = tr.assert;

	tr.addTest('construct', () => {
		const p = {
			edition:'English_Scrabble',
			dictionary:'Oxford_5000',
			secondsPerPlay: 60,
			minutesPerPlay: 999, // secondsToPlay should override
			predictScore: true,
			allowTakeBack: true,
			checkDictionary: true,
			minPlayers: 5,
			maxPlayers: 10,
			debug: NOISY
		};
		return new Game(p)
		.create()
		.then(game => {
			assert.equal(game.edition, p.edition);
			assert.equal(game.dictionary, p.dictionary);
			assert.equal(game.secondsPerPlay, 60);
			assert(game.predictScore);
			assert(game.allowTakeBack);
			assert(game.checkDictionary);
			assert.equal(game.minPlayers, 5);
			assert.equal(game.maxPlayers, 10);
		});
	});
	
	tr.addTest('basics', () => {
		const p = {
			edition:'English_Scrabble',
			dictionary:'Oxford_5000',
			minutesPerPlay: 999,
			predictScore: false,
			allowTakeBack: false,
			checkDictionary: false,
			minPlayers: 30,
			maxPlayers: 1,
			debug: NOISY
		};

		return new Game(p)
		.create()
		.then(game => {
			assert.equal(game.edition, p.edition);
			assert.equal(game.dictionary, p.dictionary);
			assert.equal(game.secondsPerPlay, 999*60);
			assert(!game.predictScore);
			assert(!game.allowTakeBack);
			assert(!game.checkDictionary);
			assert.equal(game.minPlayers, 30);
			assert.equal(game.maxPlayers, 0);

			const player1 = new Player({name:'player1', key:"rhino", isRobot:true});
			game.addPlayer(player1);
			const player2 = new Player({name:'player2', key:"soffit", isRobot:false});
			game.addPlayer(player2);
			const player3 = new Player({name:'player3', key:"clean", isRobot:false});
			game.addPlayer(player3);
			game.whosTurnKey = player2.key;

			player3.rack.empty();
			player1.score = 1;
			player2.score = 2;
			player3.score = 3;

			let player = game.getPlayer();
			assert.equal(player.key, player2.key);
			player = game.getPlayer(player2.key);
			assert.equal(player.key, player2.key);
			assert.equal(game.nextPlayer().key, player3.key);
			assert.equal(game.previousPlayer().key, player1.key);
			assert.equal(game.nextPlayer().key, player3.key);
			assert.equal(game.winningScore(), 3);
			assert.equal(game.getPlayerWithNoTiles().key, player3.key);
		});
	});

	tr.addTest('autoplay', () => {
		const game = new Game({
			edition:'English_Scrabble',
			dictionary:'Oxford_5000',
			debug: NOISY
		});

		return game.create()
		.then(game => {
			let player = new Player({name:'test', key:"cheese", isRobot:true});
			game.addPlayer(player);
			// Override the random rack
			player.rack.empty();
			player.rack.addTile(new Tile({letter:'I', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:null, isBlank:true, score:0}));
			game.whosTurnKey = player.key;
			return game.autoplay();
		})

		.then(() => new Game({
			edition: 'Tiny', dictionary: 'Oxford_5000', debug: NOISY
		}).create())
		.then(game => {
			let player = new Player({name:'test', key:"zebra", isRobot:true});
			game.addPlayer(player);
			game.whosTurnKey = player.key;
			player.rack.empty();
			player.rack.addTile(new Tile({letter:'A', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'B', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'C', isBlank:false, score:1}));
			player.rack.addTile(new Tile({letter:'D', isBlank:false, score:1}));
			return game.autoplay(player);
		})

		.then(() => new Game({
			edition:'Tiny', dictionary:'SOWPODS_English', debug: NOISY
		}).create())
		.then(game => {
			let player = new Player({name:'test', key:"isolate", isRobot:true});
			game.addPlayer(player);
			game.whosTurnKey = player.key;
			player.rack.empty();
			player.rack.addTile(new Tile({letter:' ', isBlank:true, score:1}));
			player.rack.addTile(new Tile({letter:undefined, isBlank:true, score:1}));
			player.rack.addTile(new Tile({letter:null, isBlank:true, score:1}));
			return game.autoplay(player);
		});
	});
	
	tr.addTest('swap', () => {
		const game = new Game({
			edition:'Tiny', dictionary:'Oxford_5000', debug: NOISY
		});
		const player1 = new Player({name:'test1', key:"one", isRobot:false});
		const player2 = new Player({name:'test2', key:"two", isRobot:false});
		
		return game.create()
		.then(game => {
			game.addPlayer(player1);
			player1.rack.empty();
			player1.rack.addTile(
				new Tile({letter:'A', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'B', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'C', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'D', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'E', isBlank:false, score:1}));
			game.addPlayer(player2);

			game.connect(new PSocket(), player1.key);
			game.connect(new PSocket(), player2.key);

			// Leave 5 tiles in the bag - enough to swap
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount() - 5);
			game.whosTurnKey = player1.key;
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
		.then(turn => game.finishTurn(turn))
		.then(() => {
			const ps = game.getConnection(player1);
			const ms = ps.messages.filter(mess => mess.message === 'turn');

			let turn = ms[0].data;
			//console.log('SWAP', turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'swap');
			assert.equal(turn.words.length, 0);
			assert.equal(turn.placements.length, 0);
			assert.equal(turn.replacements.length, 3);
			assert.equal(turn.score, 0);
			assert.equal(turn.bonus, 0);
			assert.equal(turn.playerKey, player1.key);
			assert.equal(turn.nextToGoKey, player2.key);
		});
	});

	tr.addTest('makeMove', () => {
		const W = new Tile({letter:'W', isBlank:false,
							score:1, col: 7, row: 7});
		const O = new Tile({letter:'O', isBlank:false,
							score:1, col: 8, row: 7});
		const R = new Tile({letter:'R', isBlank:false,
							score:1, col: 9, row: 7});
		const D = new Tile({letter:'D', isBlank:false,
							score:1, col: 10, row: 7});
		const move = new Move({
			placements: [ W, O, R, D ],
			words: [ { word: 'WORD', score: 99 }],
			score: 99
		});
		const player1 = new Player({name:'test1', key:"one", isRobot:false});
		const player2 = new Player({name:'test2', key:"two", isRobot:false});

		const game = new Game({edition:'Tiny', dictionary:'Oxford_5000', debug:NOISY});
		return game.create()
		.then(game => {
			game.addPlayer(player1);
			player1.rack.empty();
			player1.rack.addTile(
				new Tile({letter:'W', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'O', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'R', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'D', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'X', isBlank:false, score:1}));
			game.addPlayer(player2);

			game.connect(new PSocket(), player1.key);
			game.connect(new PSocket(), player2.key);

			// Leave 3 tiles in the bag - not enough to refill the rack
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount() - 3);
			game.whosTurnKey = player1.key;
			return game.makeMove(move)
			.then(turn => game.finishTurn(turn));
		})
		.then(() => {
			const ps = game.getConnection(player1);
			const ms = ps.messages.filter(mess => mess.message === 'turn');
			
			let turn = ms[0].data;
			//console.log("MAKEMOVE", turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'move');
			assert.equal(turn.playerKey, player1.key);
			assert.equal(turn.nextToGoKey, player2.key);
			assert.equal(turn.score, move.score);
			assert.deepEqual(turn.words, move.words);
			assert.deepEqual(turn.placements, move.placements);
			let newt = turn.replacements;
			assert.equal(3, newt.length);
		});
	});

	tr.addTest('lastMove', () => {
		const game = new Game({edition:'Tiny', dictionary:'Oxford_5000', debug:NOISY});
		const player1 = new Player({name:'test1', key:"mud", isRobot:false});
		const player2 = new Player({name:'test2', key:"climax", isRobot:false});
		const move = new Move({
			placements: [
				new Tile({letter:'X', isBlank:false, score:1, col: 6, row: 7}),
				new Tile({letter:'W', isBlank:false, score:1, col: 7, row: 7}),
				new Tile({letter:'O', isBlank:false, score:1, col: 8, row: 7}),
				new Tile({letter:'R', isBlank:false, score:1, col: 9, row: 7}),
				new Tile({letter:'D', isBlank:false, score:1, col: 10, row: 7})
			],
			words: [ { word: 'XWORD', score: 99 }],
			score: 99
		});
		return game.create()
		.then(game => {
			game.addPlayer(player1);
			player1.rack.empty();
			player1.rack.addTile(
				new Tile({letter:'W', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'O', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'R', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'D', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'X', isBlank:false, score:1}));
			game.addPlayer(player2);
			game.connect(new PSocket(), player1.key);
			game.connect(new PSocket(), player2.key);
			// Empty the bag
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount());
			game.whosTurnKey = player1.key;
			return game.makeMove(move)
			.then(turn => game.finishTurn(turn));
		})
		.then(() => {
			const ps = game.getConnection(player1);
			const ms = ps.messages.filter(mess => mess.message === 'turn');
			assert.equal(ms.length, 1);
			const turn = ms[0].data;
			//console.log("LASTMOVE", turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'move');
			assert.equal(turn.playerKey, player1.key);
			assert.equal(turn.nextToGoKey, player2.key);
			assert.equal(turn.score, 99);
			assert.deepEqual(turn.words, move.words);
			assert.deepEqual(turn.placements, move.placements);
			assert.equal(0, turn.replacements.length);
		});
	});

	tr.addTest('confirm', () => {
		const game =  new Game({edition:'Tiny', dictionary:'Oxford_5000', debug:NOISY});
		const player1 = new Player({name:'test1', key:"cloud", isRobot:false});
		const player2 = new Player({name:'test2', key:"squirrel", isRobot:false});
		return game.create()
		.then(game => {
			game.addPlayer(player1);
			player1.rack.empty();
			player1.rack.addTile(
				new Tile({letter:'X', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'Y', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'Z', isBlank:false, score:1}));
			game.addPlayer(player2);
			player2.rack.empty();
			game.connect(new PSocket(), player1.key);
			game.connect(new PSocket(), player2.key);
			// Empty the bag
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount());
			game.whosTurnKey = player1.key;
			return game.confirmGameOver('Game over')
			.then(turn => game.finishTurn(turn));
		})
		.then(() => {
			const ps = game.getConnection(player1);
			const ms = ps.messages.filter(mess => mess.message === 'turn');
			const turn = ms[0].data;
			//console.log("CONFIRM", turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'Game over');
			assert.equal(turn.playerKey, player1.key);
			assert.equal(turn.emptyPlayerKey, player2.key);
			assert(!turn.nextToGoKey);
			assert.equal(turn.score[player1.key], -3);
			assert.equal(turn.score[player2.key], 3);
		});
	});

	tr.addTest('badChallenge', () => {
		// Implicitly tests pass
		const game = new Game({edition:'Tiny', dictionary:'Oxford_5000', debug:NOISY});
		const player1 = new Player({name:'test1', key:"river", isRobot:false});
		const player2 = new Player({name:'test2', key:"footpad", isRobot:false});
		const move = new Move({
			placements: [
				new Tile({letter:'S', isBlank:false, score:1, col: 7, row: 7}),
				new Tile({letter:'I', isBlank:false, score:1, col: 8, row: 7}),
				new Tile({letter:'N', isBlank:false, score:1, col: 9, row: 7}),
				new Tile({letter:'K', isBlank:false, score:1, col: 10, row: 7})
			],
			words: [ { word: 'SINK', score: 99 }],
			score: 99
		});
		return game.create()
		.then(game => {
			game.addPlayer(player1);
			player1.rack.empty();
			player1.rack.addTile(
				new Tile({letter:'S', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'I', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'N', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'K', isBlank:false, score:1}));
			game.addPlayer(player2);
			game.connect(new PSocket(), player1.key);
			game.connect(new PSocket(), player2.key);
			game.whosTurnKey = player1.key;
			return game.makeMove(move)
			.then(() => game.challenge())
			.then(turn => game.finishTurn(turn));
		})
		.then(() => {
			const ps = game.getConnection(player1);
			const ms = ps.messages.filter(mess => mess.message === 'turn');
			const turn = ms[0].data;
			//console.log("BADCHALLENGE", turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'challenge-failed');
			assert.equal(turn.playerKey, player2.key);
			assert.equal(turn.nextToGoKey, player1.key);
		});
	});

	tr.addTest('goodChallenge', () => {
		const game = new Game({edition:'Tiny', dictionary:'Oxford_5000', debug:NOISY});
		const player1 = new Player({name:'test1', key:"one", isRobot:false});
		const player2 = new Player({name:'test2', key:"two", isRobot:false});
		const move = new Move({
			placements: [
				new Tile({letter:'X', isBlank:false, score:1, col: 7, row: 7}),
				new Tile({letter:'Y', isBlank:false, score:1, col: 8, row: 7}),
				new Tile({letter:'Z', isBlank:false, score:1, col: 9, row: 7}),
				new Tile({letter:'Z', isBlank:false, score:1, col: 10, row: 7}) ],
			words: [ { word: 'XYZZ', score: 99 }],
			score: 99
		});
		return game.create()
		.then(() => {
			game.addPlayer(player1);
			player1.rack.empty();
			player1.rack.addTile(new Tile({letter:'X', isBlank:false, score:1}));
			player1.rack.addTile(new Tile({letter:'Y', isBlank:false, score:1}));
			player1.rack.addTile(new Tile({letter:'Z', isBlank:false, score:1}));
			player1.rack.addTile(new Tile({letter:'Z', isBlank:false, score:1}));
			player1.rack.addTile(new Tile({letter:'Y', isBlank:false, score:1}));
			game.addPlayer(player2);
			game.connect(new PSocket(), player1.key);
			game.connect(new PSocket(), player2.key);
			game.whosTurnKey = player1.key;
			return game.makeMove(move)
			.then(() => game.challenge())
			.then(turn => game.finishTurn(turn))
			.then(() => {
				const ps = game.getConnection(player1);
				const ms = ps.messages.filter(mess => mess.message === 'turn');
				const turn = ms[0].data;
				//console.log("GOODCHALLENGE", turn);
				assert(turn instanceof Turn);
				assert.equal(turn.type, 'challenge-won');
				assert.equal(turn.playerKey, player1.key);
				assert.equal(turn.nextToGoKey, player2.key);
				assert.equal(turn.challengerKey, player2.key);
				assert.equal(turn.score, -99);
			});
		});
	});

	tr.addTest('takeBack', () => {
		const game = new Game({debug:false,edition:'Tiny', dictionary:'Oxford_5000', debug:NOISY});
		const player1 = new Player({name:'test1', key:"psychologist", isRobot:false});
		const player2 = new Player({name:'test2', key:"chatter", isRobot:false});
		const move = new Move({
			placements: [
				new Tile({letter:'X', isBlank:false, score:1, col: 7, row: 7}),
				new Tile({letter:'Y', isBlank:false, score:1, col: 8, row: 7}),
				new Tile({letter:'Z', isBlank:false, score:1, col: 10, row: 7})
			],
			words: [ { word: 'XYZ', score: 3 }],
			score: 3
		});
		return game.create()
		.then(() => {
			game.addPlayer(player1);
			player1.rack.empty();
			player1.rack.addTile(
				new Tile({letter:'X', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'Y', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'Z', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'Z', isBlank:false, score:1}));
			player1.rack.addTile(
				new Tile({letter:'Y', isBlank:false, score:1}));
			game.addPlayer(player2);
			game.connect(new PSocket(), player1.key);
			game.connect(new PSocket(), player2.key);
			game.whosTurnKey = player1.key;
		})
		.then(() => game.makeMove(move))
		.then(turn => game.finishTurn(turn))
		// Player 0 takes their move back
		.then(() => game.takeBack('took-back'))
		.then(turn => game.finishTurn(turn))
		.then(() => {
			const ps = game.getConnection(player1);
			const ms = ps.messages.filter(mess => mess.message === 'turn');
			const turn = ms[1].data;
			//console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'took-back');
			assert.equal(turn.playerKey, player1.key);
			assert.equal(turn.nextToGoKey, player1.key);
			// challengerKey isn't relevant, but is set so check it
			assert.equal(turn.challengerKey, player2.key);
			assert.equal(turn.score, -3);
		});
	});

	tr.addTest('challengeLastMoveGood', () => {
		const game = new Game({
			edition:'Tiny', dictionary:'Oxford_5000', debug: NOISY
		});
		const player1 = new Player({name:'test1', key:"sheep", isRobot:false});
		const player2 = new Player({name:'test2', key:"wolf", isRobot:false});

		return game.create()
		.then(game => {
			game.addPlayer(player1);
			player1.rack.empty();
			player1.rack.addTile(new Tile({letter:'X', isBlank:false, score:1}));
			player1.rack.addTile(new Tile({letter:'Y', isBlank:false, score:1}));
			player1.rack.addTile(new Tile({letter:'Z', isBlank:false, score:1}));
			game.addPlayer(player2);
			game.whosTurnKey = player1.key;

			// Empty the bag
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount());
			game.connect(new PSocket(), player1.key);
			game.connect(new PSocket(), player2.key);
			const move = new Move({
				placements: [
					new Tile({letter:'X', isBlank:false, score:1, col: 6, row: 7}),
					new Tile({letter:'Y', isBlank:false, score:1, col: 7, row: 7}),
					new Tile({letter:'Z', isBlank:false, score:1, col: 8, row: 7}),
				],
				words: [ { word: 'XYZ', score: 3 }],
				score: 3
			});
			
			return game.makeMove(move);
		})
		// Player 0 has played, so issue a challenge on behalf of player 2
		.then(() => game.challenge())
		.then(turn => game.finishTurn(turn))
		.then(() => {
			const ps = game.getConnection(player1);
			const ms = ps.messages.filter(mess => mess.message === 'turn');
			const turn = ms[0].data;
			//console.log(turn);
			assert(turn instanceof Turn);
			assert.equal(turn.type, 'challenge-won');
			assert.equal(turn.playerKey, player1.key);
			assert.equal(turn.nextToGoKey, player2.key);
			assert.equal(turn.score, -3);
			assert.equal(turn.replacements.length, 0);
			assert.equal(turn.challengerKey, player2.key);
			assert(!turn.emptyPlayerKey);
		});
	});

	tr.addTest('challengeLastMoveBad', () => {
		const game = new Game({
			edition:'Tiny', dictionary:'Oxford_5000', debug: NOISY});
		const player1 = new Player({name:'test1', key:"one", isRobot:false});
		const player2 = new Player({name:'test2', key:"two", isRobot:false});

		return game.create()
		.then(game => {
			game.addPlayer(player1);
			player1.rack.empty();
			player1.rack.addTile(new Tile({letter:'A', isBlank:false, score:1}));
			player1.rack.addTile(new Tile({letter:'R', isBlank:false, score:1}));
			player1.rack.addTile(new Tile({letter:'T', isBlank:false, score:1}));
			game.addPlayer(player2);
			
			game.whosTurnKey = player1.key;

			game.connect(new PSocket(), player1.key);
			game.connect(new PSocket(), player2.key);
			
			// Empty the bag
			game.letterBag.getRandomTiles(
				game.letterBag.remainingTileCount());

			const move = new Move({
				placements: [
					new Tile({letter:'A', isBlank:false, score:1, col: 6, row: 7}),
					new Tile({letter:'R', isBlank:false, score:1, col: 7, row: 7}),
					new Tile({letter:'T', isBlank:false, score:1, col: 8, row: 7}),
				],
				words: [ { word: 'ART', score: 3 }],
				score: 3
			});
			return game.makeMove(move)
			.then(turn => game.finishTurn(turn))
			// Player 0 has played, so issue a challenge on behalf of player 1
			.then(() => game.challenge())
			.then(turn => game.finishTurn(turn))
			.then(() => {
				// Check sent messages
				const ps = game.getConnection(player1);
				const ms = ps.messages.filter(mess => mess.message === 'turn');

				let turn = ms[0].data;
				assert(turn instanceof Turn);
				assert.equal(turn.replacements.length, 0); // bag empty
				assert.equal(turn.playerKey, player1.key);
				assert.equal(turn.nextToGoKey, player2.key);

				turn = ms[1].data;
				assert(turn instanceof Turn);
				assert.equal(turn.type, 'challenge-failed');
				assert.equal(turn.playerKey, player2.key);
				assert.equal(turn.nextToGoKey, undefined);
				// Still empty!
				assert.equal(turn.emptyPlayerKey, player1.key);
				// Game should be over

			});
		});
	});

	tr.addTest('robotChallenge', () => {
		const game = new Game({
			edition: "Tiny",
			dictionary: "Oxford_5000",
			debug: NOISY
		});

		const human = new Player({name:'Man', key:"crime", isRobot:false});
		const robot = new Player({name:'Machine', key:"punishment",
								  isRobot:true, canChallenge: true});

		return game.create()
		.then(game => {
			game.addPlayer(human);
			human.rack.empty();
			human.rack.addTile(
				new Tile({letter:'X', isBlank:false, score:1}));
			human.rack.addTile(
				new Tile({letter:'X', isBlank:false, score:1}));
			human.rack.addTile(
				new Tile({letter:'X', isBlank:false, score:1}));
			
			game.connect(new PSocket(), human.key);

			game.addPlayer(robot);
			robot.rack.empty();
			robot.rack.addTile(
				new Tile({letter:'O', isBlank:false, score:1}));
			robot.rack.addTile(
				new Tile({letter:'N', isBlank:false, score:1}));
			robot.rack.addTile(
				new Tile({letter:'E', isBlank:false, score:1}));

			game.whosTurnKey = human.key;

			// Empty the bag
			//game.letterBag.getRandomTiles(
			//	game.letterBag.remainingTileCount());

			const move = new Move({
				placements: [
					new Tile({letter:'X', isBlank:false, score:1, col: 6, row: 7}),
					new Tile({letter:'X', isBlank:false, score:1, col: 7, row: 7}),
					new Tile({letter:'X', isBlank:false, score:1, col: 8, row: 7}),
				],
				words: [ { word: 'XXX', score: 3 }],
				score: 3
			});

			return game.makeMove(move)
			.then(turn => game.finishTurn(turn))
			// Player 1 has played. The autoplay should issue a challenge,
			// which is a turn and needs to be reflected in the UI. At the
			// same time, the robot needs to compute the next play so we
			// end up notifying two turns.
			.then(() => {
				const ps = game.getConnection(human);
				const ms = ps.messages;
				assert.equal(ms.length, 4);
				assert.equal(ms[0].message, 'turn');
				assert.equal(ms[0].data.type, 'move');
				assert.equal(ms[1].message, 'connections');
				assert.equal(ms[2].message, 'turn');
				assert.equal(ms[2].data.type, 'challenge-won');
				assert.equal(ms[2].data.score, -3);
				assert.equal(ms[2].data.bonus, 0);
				assert.equal(ms[2].data.playerKey, 'crime');
				assert.equal(ms[2].data.challengerKey, 'punishment');
				assert.equal(ms[3].message, 'turn');
				assert.equal(ms[3].data.type, 'move');
				assert.equal(ms[3].data.score, 16);
				assert.equal(ms[3].data.playerKey, 'punishment');
				assert.equal(ms[3].data.nextToGoKey, 'crime');
			});
		});
	});

	tr.run();
});

