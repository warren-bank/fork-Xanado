/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

// The documented method for importing socket.io in ESM is:
// import { io } from "socket.io/client-dist/socket.io.esm.min.js";
// This works fine in the unpacked version, but fails when webpacked.
//
// The following clumsy hack is the only way I could get it to work in both
// the unpacked and th packed versions. If someone can do better, please do!
/* global io */
import * as SI from "socket.io/client-dist/socket.io.js";
if (typeof io === "undefined")
  window.io = SI.io;

import "jquery/dist/jquery.js";
import "jquery-ui/dist/jquery-ui.js";

import { Game } from "../game/Game.js";
import { Tile } from "../game/Tile.js";
import { UI } from "../browser/UI.js";

/**
 * Mixin with common code shared between client game and games interfaces
 * (client/ClientGamesUI.js and client/ClientGameUI.js) but NOT used by
 * standalone.
 * @mixin client/ClientUIMixin
 */
const ClientUIMixin = superclass => class extends superclass {

  /**
   * Session object describing signed-in user
   * @instance
   * @memberof client/ClientUIMixin
   * @member {object}
   */
  session = undefined;

  /**
   * Cache of defaults object, lateinit in build()
   */
  defaults = undefined;

  /**
   * @implements browser/GameUIMixin
   * @memberof client/ClientUIMixin
   * @instance
   */
  getGameDefaults() {
    if (this.defaults)
      return Promise.resolve(this.defaults);
    return $.get("/defaults")
    .then(defaults => this.defaults = defaults);
  }

  /**
   * @implements browser/GameUIMixin
   * @memberof client/ClientUIMixin
   * @instance
   */
  getLocales() {
    return $.get("/locales");
  }

  /**
   * @implements UI
   * @instance
   * @memberof CientUIMixin
   * @override
   */
  getCSS() {
    return $.get("/css");
  }

  /**
   * Make a mechanical play.
   * @instance
   * @memberof CientUIMixin
   */
  mechanicalTurk() {
    console.debug("Mechanical Turk is playing");

    // call swap 1 turn in 10
    // call challenge 1 turn in 10
    // pass 1 turn in turn
    // autoplay the other 7
    const prob = Math.random();
    if (prob < 0.1) {
      const tiles = [];
      this.player.rack.forEachTiledSquare(
        square => tiles.push(square.tile));
      if (tiles.length === this.game.rackSize) {
        const nTiles = Math.floor(Math.random() * this.game.rackSize);
        if (nTiles > 0) {
          while (tiles.length > nTiles)
            tiles.shift();
          this.sendCommand(Game.Command.SWAP, tiles.map(t => new Tile(t)));
          return;
        }
      }
    }

    if (prob < 0.2) {
      // See if there's a turn we can challenge
      let challengeable = {};
      challengeable[this.player.key] = false;
      this.game.turns.forEach(t => {
        challengeable[t.playerKey] = (t.type === Game.Turns.PLAYED);
      });
      challengeable = Object.keys(challengeable).filter(
        p => p !== this.player.key && challengeable[p]);

      if (challengeable.length > 0) {
        challengeable = challengeable[
          Math.floor(Math.random() * challengeable.length)];
        this.sendCommand(Game.Command.CHALLENGE, {
          challengedKey: challengeable
        });
        return;
        // otherwise drop through
      }
    }

    if (prob >= 0.2 && prob < 0.3) {
      this.sendCommand(Game.Command.PASS);
      return;
    }

    // autoplay
    this.notifyBackend(Game.Notify.MESSAGE, {
      sender: this.player.name,
      text: "autoplay"
    });
  }

  /**
   * Process arguments to the URL. For example, a game passed by key.
   * Subclasses may override.
   * @instance
   * @memberof client/ClientUIMixin
   * @return {Promise} a promise that resolves when arguments are processed.
   */
  processArguments() {
    return Promise.resolve();
  }

  /**
   * Set up the UI.
   * @instance
   * @memberof client/ClientUIMixin
   */
  create() {
    console.debug("Creating ClientUIMixin");
    // Set up translations and connect to channels
    let args;
    return this.getGameDefaults()
    .then(() => {
      args = UI.parseURLArguments(document.URL);
      if (args.debug)
        this.debug = console.debug;
    })
    .then(() => this.getSession())
    .catch(() => this.observer = (args.observer || "Anonymous"))
    .then(() => this.initTheme())
    .then(() => this.initLocale())
    .then(() => this.processArguments(args))
    .then(() => this.channel = io().connect())
    .then(() => this.attachChannelHandlers())
    .then(() => this.attachUIEventHandlers())
    .then(() => {

      $("#signin-button")
      .on("click", () =>
          import(
            /* webpackMode: "lazy" */
            /* webpackChunkName: "LoginDialog" */
            "../client/LoginDialog.js")
          .then(mod => new mod[Object.keys(mod)[0]]({
            // postAction is set in code
            postResult: () => window.location.reload(),
            error: e => this.alert(e, $.i18n("failed", $.i18n("Sign in")))
          })));

      $("#signout-button")
      .on("click", () => {
        $.post("/signout")
        .then(() => console.debug("Logged out"))
        .catch(e => this.alert(e, $.i18n("failed", $.i18n("Sign out"))))
        .then(() => {
          this.session = undefined;
          this.refresh();
        });
      });

      $(".loading").hide();
      $(".waiting").removeClass("waiting").show();

      // `autoplay` is a debug device. If it appears in the URL args
      // then once the first play has been made by the human, remaining
      // plays will be automated. See `mechanicalTurk` for details.
      if (args.autoplay)
        $(document).on("MY_TURN", () => this.mechanicalTurk());
    });
  }

  /**
   * @override
   * @instance
   * @memberof client/ClientUIMixin
   */
  attachChannelHandlers() {

    let $reconnectDialog = null;

    // socket.io events 'new_namespace', 'disconnecting',
    // 'initial_headers', 'headers', 'connection_error' are not handled

    this.channel

    .on("connect", () => {
      // Note: "connect" is synonymous with "connection"
      // Socket has connected to the server
      console.debug("b>f connect");
      if ($reconnectDialog) {
        $reconnectDialog.dialog("close");
        $reconnectDialog = null;
      }
      this.readyToListen();
    })

    .on("disconnect", () => {
      // Socket has disconnected for some reason
      // (server died, maybe?) Back off and try to reconnect.
      console.debug(`--> disconnect`);
      const mess = $.i18n("text-disconnected");
      $reconnectDialog = this.alert(mess, $.i18n("Server disconnected"));
      setTimeout(() => {
        // Try and rejoin after a 3s timeout
        this.readyToListen()
        .catch(e => {
          console.debug(e);
          if (!$reconnectDialog)
            this.alert(e, $.i18n("Reconnect failed"));
        });
      }, 3000);
    });

    super.attachChannelHandlers();
  }

  /**
   * @implements UI
   * @instance
   * @memberof client/ClientUIMixin
   * @override
   */
  getEditions() {
    return $.get(`/editions`);
  }

  /**
   * @implements browser/GameUIMixin
   * @instance
   * @memberof client/ClientUIMixin
   * @override
   */
  getEdition(ed) {
    return $.get(`/edition/${ed}.js`);
  }

  /**
   * @implements UI
   * @instance
   * @memberof client/ClientUIMixin
   * @override
   */
  getDictionaries() {
    return $.get(`/dictionaries`);
  }

  /**
   * Identify the signed-in user.
   * @instance
   * @implements browser/UI
   * @memberof client/ClientUIMixin
   * @override
   * @return {Promise} a promise that resolves to the (redacted)
   * session object if someone is signed in, or undefined otherwise.
   * @throws Error if there is no active session
   */
  getSession() {
    $(".signed-in,.not-signed-in").hide();
    return $.get("/session")
    .then(session => {
      console.debug(`Signed in as '${session.name}'`);
      $(".not-signed-in").hide();
      $(".signed-in")
      .show()
      .find("span")
      .first()
      .text(session.name);
      this.session = session;
      return session;
    })
    .catch(() => {
      $(".signed-in").hide();
      $(".not-signed-in").show();
      if (typeof this.observer === "string")
        $(".observer").show().text($.i18n(
          "observer", this.observer));
      throw Error($.i18n("Not signed in"));
    });
  }

  /**
   * @implements browser/GameUIMixin
   * Invoked via click_turnButton.
   * @memberof client/ClientUIMixin
   * @instance
   */
  action_anotherGame() {
    $.post(`/anotherGame/${this.game.key}`)
    .then(nextGameKey => {
      this.game.nextGameKey = nextGameKey;
      this.setAction("action_nextGame", /*i18n*/"Next game");
      this.enableTurnButton(true);
    })
    .catch(console.error);
  }

  /**
   * @implements browser/GameUIMixin
   * @memberof client/ClientUIMixin
   * @instance
   */
  action_nextGame() {
    const key = this.game.nextGameKey;
    $.post(`/join/${key}`)
    .then(() => {
      const s = location;
      location.replace(s.replace(/game=[^;&]*/, `game=${key}`));
    })
    .catch(console.error);
  }

  /**
   * @implements browser/GameUIMixin
   * If a user is signed in, the value will be taken from their
   * session (and will default if it is not defined).
   * @instance
   * @memberof client/ClientUIMixin
   * @param {string} key setting to retrieve
   * @return {string|number|boolean} setting value
   */
  getSetting(key) {
    return (this.session && this.session.settings
            && typeof this.session.settings[key] !== "undefined")
    ? this.session.settings[key]
    : this.defaults[key];
  }

  /**
   * Send a setting to the server
   * @implements browser/GameUIMixin
   * @memberof client/ClientUIMixin
   * @instance
   * @override
   */
  setSetting(key, value) {
    const vals = {};
    vals[key] = value;
    return this.setSettings(vals);
  }

  /**
   * Send a set of settings to the server
   * @memberof client/ClientUIMixin
   * @instance
   * @implements browser/UI
   * @override
   */
  setSettings(vals) {
    return $.ajax({
      url: "/session-settings",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(vals)
    });
  }
};

export { ClientUIMixin }
