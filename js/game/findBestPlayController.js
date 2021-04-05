/* See README.md at the root of this distribution for copyright and
   license information */

/* eslint-env amd, node */

/**
 * This is the controller side of a best play thread. It provides 
 * a simple interface that can be passed a Game and a rack of letters.
 * Note that the Game will be passed to the findBestPlayWorker as a
 * javascript object - it will lose it's classiness, so the worker
 * can't call methods on it. If it becomes necessary to do so, we can
 * use Icebox to freeze-thaw it.
 */
define("game/findBestPlayController", ["worker_threads"], threads => {

	/**
	 * Interface should be the same as for findBestMove.js so they
	 * can be switched in and out for debug.
	 * @param game game to analyse
	 * @param array of useable letters, ' ' means blank tile
	 * @param listener fn() taking a string or a best play
	 */
	function findBestPlayController(game, letters, listener) {
		return new Promise((resolve, reject) => {
			// Allow 30s to find a play
			const timer = setTimeout(() => {
				console.log("findBestPlay timed out");
				worker.terminate();
			}, 30000);
			
			const worker = new threads.Worker(
				`${APP_DIR}/js/game/findBestPlayWorker.js`,
				{ workerData: { game: game, rack: letters } });

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
