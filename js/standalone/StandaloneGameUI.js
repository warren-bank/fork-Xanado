/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

define([
  "common/Utils", "common/Fridge", "common/Channel",
  "dawg/Dictionary",
  "backend/BackendGame",
  "browser/BrowserGame",
  "browser/UI", "browser/GameUIMixin", "browser/Dialog",
  "standalone/StandaloneUIMixin"
], (
  Utils, Fridge, Channel,
  Dictionary,
  BackendGame,
  BrowserGame,
  UI, GameUIMixin, Dialog,
  StandaloneUIMixin
) => {

  /**
   * Game that runs solely in the browser (no server).
   * To keep the codebase consistent with the client-server model, we
   * have two copies of the game; one is the "client side" (the front end)
   * version, while the other is the "server" version (the back end).
   */
  class StandaloneGameUI extends StandaloneUIMixin(GameUIMixin(UI)) {

    /**
     * Game on the "server" side
     */
    backEndGame = undefined;

    /**
     * Game on the "client" side
     */
    frontEndGame = undefined;

    /**
     * @implements browser/GameUIMixin#sendCommand
     */
    sendCommand(command, args) {
      const bePlayer = this.backEndGame.getPlayerWithKey(
        this.player.key);
      this.backEndGame.dispatchCommand(command, bePlayer, args);
    }

    /**
     * @implements browser/GameUIMixin#action_anotherGame
     */
    action_anotherGame() {
      this.backEndGame.anotherGame()
      .then(nextGame => {
        this.backEndGame.nextGameKey =
        this.frontEndGame.nextGameKey = nextGame.key;
        this.setAction("action_nextGame", /*i18n*/"Next game");
        this.enableTurnButton(true);
      })
      .catch(assert.fail);
    }

    /**
     * @implements browser/GameUIMixin#action_nextGame
     */
    action_nextGame() {
      this.redirectToGame(this.backEndGame.nextGameKey);
    }

    /**
     * Create and run the game.
     */
    create() {

      super.create();

      const player_key = this.session.key;

      const fe = new Channel();
      const be = new Channel();
      // Cross-couple the channels
      fe.receiver = be;
      be.receiver = fe;

      be.on(
        BackendGame.Notify.MESSAGE,
        message => {
          // Chat message
          const mess = message.text.split(/\s+/);
          const verb = mess[0];

          switch (verb) {
          case "autoplay":
            // Tell *everyone else* that they asked for a hint
            be.game.autoplay();
            break;
          case "hint":
            be.game.hint(be.player);
            break;
          case "advise":
            be.game.toggleAdvice(be.player);
            break;
          case "allow":
            be.game.allow(be.player, mess[1]);
            break;
          default:
            be.game.notifyAll(BackendGame.Notify.MESSAGE, message);
          }
        });

      this.channel = fe;

      this.getGameDefaults()
      .then(() => this.initTheme())
      .then(() => this.initLocale())
      .then(() => {

        // Load the server game from localStorage, or create a new
        // game from defaults if there isn't one there.
        if (this.args.game) {
          console.debug(`Loading game ${this.args.game} from local storage`);
          return this.db.get(this.args.game, BackendGame)
          .then(game => {
            this.backEndGame = game;
            this.backEndGame._debug = this.args.debug
            ? console.debug : () => {};
            return game.onLoad(this.db);
          });

        } else {
          console.debug("Constructing new game");
          const setup = $.extend({}, StandaloneUIMixin.DEFAULTS);
          setup._debug = this.args.debug ? console.debug : () => {};
          return this.createGame(setup)
          .then(game => this.backEndGame = game);
        }
      })
      .then(() => {
        this.attachChannelHandlers();

        // Make a browser copy of the game
        this.frontEndGame =
        Fridge.thaw(Fridge.freeze(this.backEndGame), BrowserGame);

        // Fix the player
        this.player
        = this.frontEndGame.player
        = this.frontEndGame.getPlayerWithKey(player_key);
      })
      .then(() => this.createUI(this.frontEndGame))
      .then(() => {
        $("#gameSetupButton")
        .on("click", () => {
          Dialog.open("browser/GameSetupDialog", {
            html: "standalone_GameSetupDialog",
            ui: this,
            game: this.backEndGame,
            onSubmit: (dlg, vals) => {
              for (const key of Object.keys(vals))
                this.backEndGame[key] = vals[key];
              this.backEndGame.save();
              this.redirectToGame(this.backEndGame.key);
            },
            error: this.constructor.report
          });
        });
      })
      .then(() => this.attachUIEventHandlers())
      // Tell the backend what channel to use to send and receive
      // notifications
      .then(() => this.backEndGame.connect(be, player_key))
      .catch(e => {
        alert("Error: " + e);
      })
      .then(() => {
        $(".loading").hide();
        $(".waiting").removeClass("waiting");
      });
    }
  }

  requirejs(["touch-punch"], () => new StandaloneGameUI().create());
});
