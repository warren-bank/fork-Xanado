/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

define([
  "platform",
  "common/Fridge", "common/Utils",
  "browser/BrowserGame",
  "browser/UI", "browser/GameUIMixin", "browser/Dialog",
  "client/ClientUIMixin",
  "jquery", "jqueryui", "cookie", "browser/icon_button"
], (
  Platform,
  Fridge, Utils,
  Game,
  UI, GameUIMixin, Dialog,
  ClientUIMixin
) => {

  /**
   * User interface to a game in a browser. The Ui reflects the game state as
   * communicated from the server, through the exchange of various messages.
   * @extends UI
   * @mixes client/ClientUIMixin
   * @mixes browser/GameUIMixin
   */
  class ClientGameUI extends ClientUIMixin(GameUIMixin(UI)) {

    /**
     * Identify the logged-in user, and make sure they are playing
     * in this game.
     * @param {Game} game the game
     * @return {Promise} a promise that resolves to the player key
     * or undefined if the player is not logged in or is not in the game
     * @private
     */
    identifyPlayer(game) {
      $(".bad-user").hide();
      return this.getSession()
      .then(session => {
        if (session) {
          // Find if they are a player
          this.player = game.getPlayerWithKey(session.key);
          if (this.player)
            return this.player.key;
          $(".bad-user")
          .show()
          .find("button")
          .on("click", () => {
            $.post("/logout")
            .then(() => window.location.reload());
          });
          this.observer = this.session.name;
        }
        $(".notPlaying").show();
        return undefined;
      });
    }

    /**
     * @implements client/ClientUIMixin#processArguments
     */
    processArguments(args) {
      return super.processArguments(args)
      .then(() => {
        if (args.observer) {
          this.observer = args.observer;
          this.debug(`\tObserver "${this.observer}"`);
        }
        assert(args.game, `No game found in ${args}`);
        const gameKey = args.game;
        this.debug(`GET /game/${gameKey}`);
        return $.get(`/game/${gameKey}`)
        .then(frozen => {
          this.debug(`--> Game ${gameKey}`);
          return Fridge.thaw(frozen, Game);
        })
        .then(game => {
          return this.identifyPlayer(game)
          .then (playerKey => this.createUI(game));
        });
      });
    }

    /**
     * @implements browser/GameUIMixin#sendCommand
     * @override
     */
    sendCommand(command, args) {
      if (command !== Game.Command.REDO) {
        this.undoStack = [];
        $("#redoButton").hide();
      }
      console.debug(`POST /command/${command}`);
      this.lockBoard(true);
      this.enableTurnButton(false);
      this.cancelNotification();
      $.ajax({
        url: `/command/${command}/${this.game.key}`,
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(
          args,
          (key, value) => {
            // Don't stringify fields used by the UI.
            if (/^[_$]/.test(key))
              return undefined;
            return value;
          })
      })
      .then(r => console.debug(`command '${command}'`, r))
      .catch(console.error);
    }

    /**
     * @implements browser/GameUIMixin#attachUIEventHandlers
     * @override
     */
    attachUIEventHandlers() {

      super.attachUIEventHandlers();

      $(".pauseButton")
      .show()
      .on("click", () => this.sendCommand(Game.Command.PAUSE));
    }
  }

  requirejs(["touch-punch"], () => new ClientGameUI().create());
});
