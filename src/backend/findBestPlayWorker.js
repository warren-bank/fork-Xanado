/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, node */

import { ServerPlatform } from "../server/ServerPlatform.js";
global.Platform = ServerPlatform;
import { workerData, parentPort } from "worker_threads";
import { BackendGame } from "./BackendGame.js";
import { findBestPlay } from "../game/findBestPlay.js";

/**
 * Worker thread for findBestPlay. This allows the best play to be
 * found asynchronously, without blocking the main thread, so we can
 * time it out if necessary. See also findBestPlayController.js
 */
const info = BackendGame.fromCBOR(
  workerData, BackendGame.CLASSES);

findBestPlay(
  info.game, info.rack,
  bestPlay => parentPort.postMessage(
    BackendGame.toCBOR(bestPlay)),
  info.dictionary)
.then(() => {
  parentPort.postMessage("findBestPlayWorker is exiting");
})
.catch(e => {
  /* istanbul ignore next */
  parentPort.postMessage("findBestPlayWorker error", e);
  /* istanbul ignore next */
  throw e;
});

