/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/**
 * This is the controller side of a best play thread. It provides 
 * the same API as findBestPlay(). See also findBestPlayWorker.js
 */
define("game/findBestPlayController", [
	"worker_threads",
	"platform", "common/Fridge",
	"game/Square", "game/Game", "game/Player"
], (
	threads,
	Platform, Fridge,
	Square, Game, Player
) => {

	/**
	 * Interface is the same as for {@link findBestPlay} so they
	 * can be switched in and out.
	 */
	function findBestPlayController(
		game, letters, listener, dictpath, dictionary) {

		const ice = {
			workerData: Fridge.freeze({
				game: game,
				rack: letters,
				dictpath: dictpath,
				dictionary: dictionary
			})
		};
		return new Promise((resolve, reject) => {
			const worker = new threads.Worker(
				Platform.getFilePath("js/game/findBestPlayWorker.js"), ice);

			// Apply the game time limit
			let timer;
			if (game.timerType === Player.TIMER_TURN) {
				/* istanbul ignore next */
				timer = setTimeout(() => {
					console.log("findBestPlay timed out");
					worker.terminate();
				}, game.timeLimit * 1000);
			}

			// Pass worker messages on to listener
			worker.on("message", data => {
				listener(Fridge.thaw(data, Game.classes));
			});

			/* istanbul ignore next */
			worker.on("error", e => {
				if (timer)
					clearTimeout(timer);
				reject(e);
			});

			worker.on("exit", (code) => {
				if (timer)
					/* istanbul ignore next */
					clearTimeout(timer);
				/* istanbul ignore if */
				if (code !== 0)
					console.error(`findBestPlayWorker reported code ${code}`);
				resolve();
			});
		});
	}

	return findBestPlayController;
});
