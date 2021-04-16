/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node */
const requirejs = require('requirejs');

requirejs.config({
	baseUrl: `${__dirname}/../..`,
    nodeRequire: require,
	paths: {
		game: `js/game`,
		dawg: `js/dawg`,
		triggerEvent: 'js/server/triggerEvent'
	}
});

/**
 * Worker thread for findBestPlay. This allows the best play to be
 * found asynchronously, without blocking the main thread, so we can
 * time it out if necessary. See also findBestPlayController.js
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
