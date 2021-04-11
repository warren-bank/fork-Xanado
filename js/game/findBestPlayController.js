/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node */
/* global APP_DIR */

/**
 * This is the controller side of a best play thread. It provides 
 * the same API as findBestPlay().
 */
define("game/findBestPlayController", ["worker_threads", "game/Fridge"], (threads, Fridge) => {

	/**
	 * Interface should be the same as for findBestMove.js so they
	 * can be switched in and out for debug.
	 * @param game game to analyse
	 * @param array of useable letters, ' ' means blank tile
	 * @param listener fn() taking a string or a best play
	 */
	function findBestPlayController(game, letters, listener) {
		return new Promise((resolve, reject) => {
			const worker = new threads.Worker(
				`${APP_DIR}/js/game/findBestPlayWorker.js`,
				{
					workerData: Fridge.freeze({
						game: game,
						rack: letters
					})
				});

			// Allow 30s to find a play
			const timer = setTimeout(() => {
				console.log("findBestPlay timed out");
				worker.terminate();
			}, 30000);
			
			worker.on('message', data => {
				listener(data);
			});
			
			worker.on('error', e => {
				clearTimeout(timer);
				reject(e);
			});
			
			worker.on('exit', (code) => {
				clearTimeout(timer);
				if (code !== 0)
					console.log(`findBestPlayWorker reported code ${code}`);
				resolve();
			});
		});
	}

	return findBestPlayController;
});
