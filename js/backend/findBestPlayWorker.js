/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, node */
const requirejs = require("requirejs");

requirejs.config({
  baseUrl: `${__dirname}/../..`,
  nodeRequire: require,
  paths: {
    cbor: "node_modules/@cdot/cbor/dist/index",
    common: "js/common",
    game: "js/game",
    dawg: "js/dawg",
    backend: "js/backend",
    // TODO: normalise the platform, we shouldn't be depending on server.
    // Dictionary depends on it, for parsing paths.
    server: "js/server", // server/Platform needs I18N
    platform: "js/server/Platform"
  }
});

/**
 * Worker thread for findBestPlay. This allows the best play to be
 * found asynchronously, without blocking the main thread, so we can
 * time it out if necessary. See also findBestPlayController.js
 */
requirejs([
  "worker_threads",
  "backend/BackendGame", "backend/findBestPlay"
], (
  threads,
  BackendGame, findBestPlay
) => {
  const info = BackendGame.fromCBOR(threads.workerData, BackendGame.CLASSES);

  findBestPlay(
    info.game, info.rack,
    bestPlay => threads.parentPort.postMessage(BackendGame.toCBOR(bestPlay)),
    info.dictionary)
  .then(() => {
    threads.parentPort.postMessage("findBestPlayWorker is exiting");
  })
  .catch(e => {
    /* istanbul ignore next */
    threads.parentPort.postMessage("findBestPlayWorker error", e);
    /* istanbul ignore next */
    throw e;
  });
});
