/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* global postMessage */
/* global addEventListener */
/* global close */
/* global window */
/* global global */

import { BackendGame } from "./BackendGame.js";
import { findBestPlay } from "../game/findBestPlay.js";

/**
 * Worker thread for findBestPlay. This allows the best play to be
 * found asynchronously, without blocking the main thread, so we can
 * time it out if necessary. Simply calls {@linkcode module:game/findBestPlay}
 * @module
 */

function send(type, data) {
  postMessage(
    BackendGame.toCBOR({ type: type, data: data }));
}

addEventListener("message", event => {
  const info = BackendGame.fromCBOR(event.data, BackendGame.CLASSES);
  const platf = info.Platform == "ServerPlatform"
        ? "../server/ServerPlatform.js"
        : "../browser/BrowserPlatform.js";
  import(platf)
  .then(mod => {
    if (typeof global === "undefined")
      window.Platform = mod[info.Platform];
    else
      global.Platform = mod[info.Platform];
    findBestPlay(
      info.game, info.rack,
      bestPlay => send("play", bestPlay),
      info.dictionary)
    .then(() => {
      send("exit");
      close();
    });
  });
});

