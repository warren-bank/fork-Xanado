/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, node */
const requirejs = require('requirejs');

requirejs.config({
  baseUrl: `${__dirname}/../..`,
  nodeRequire: require,
  paths: {
    common: `js/common`,
    game: `js/game`,
    dawg: `js/dawg`,
    server: `js/server`,
    platform: 'js/server/Platform'
  }
});

/**
 * Worker thread for findBestPlay. This allows the best play to be
 * found asynchronously, without blocking the main thread, so we can
 * time it out if necessary. See also findBestPlayController.js
 */
requirejs([
  'worker_threads',
  'common/Fridge',
  'game/Game', 'game/findBestPlay'
], (
  threads,
  Fridge,
  Game, findBestPlay
) => {
  const info = Fridge.thaw(threads.workerData, Game.classes);
  findBestPlay(info.game, info.rack,
               bestPlay => threads.parentPort.postMessage(
                 Fridge.freeze(bestPlay)),
               info.dictpath, info.dictionary)
  .then(() => {
    threads.parentPort.postMessage('findBestPlayWorker is exiting');
  })
  .catch(e => {
    /* istanbul ignore next */
    threads.parentPort.postMessage('findBestPlayWorker error', e);
    /* istanbul ignore next */
    throw e;
  });
});
