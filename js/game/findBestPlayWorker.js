/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node */
/* global APP_DIR */

const requirejs = require('requirejs');

global.APP_DIR = `${__dirname}/../..`;

requirejs.config({
    nodeRequire: require,
	paths: {
		game: `${APP_DIR}/js/game`,
		dawg: `${APP_DIR}/js/dawg`,
		editions: `${APP_DIR}/editions`,
		dictionaries: `${APP_DIR}/dictionaries`
	}
});

/**
 * Worker thread for findBestPlay. Started in the worker thread to
 * find a best move.
 */
requirejs(["worker_threads", "game/Game", "game/findBestPlay"], (threads, Game, findBestPlay) => {
	
	const info = Game.thaw(threads.workerData);

	/**
	 * Note that the game is NOT a Game, but just the fields. If methods
	 * need to be called on it, then game/Fridge can be used to freeze-thaw.
	 */
	findBestPlay(info.game, info.rack,
			 bestPlay => threads.parentPort.postMessage(bestPlay))
	
	.then(() => {
		threads.parentPort.postMessage("findBestPlayWorker is exiting");
	})

	.catch(e => {
		threads.parentPort.postMessage("findBestPlayWorker error", e);
		throw e;
	});
});
