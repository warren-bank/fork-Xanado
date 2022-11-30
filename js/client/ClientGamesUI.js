/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

/**
 * Browser app for client_games.html; populate the list of live games
 */
requirejs([
  "platform",
  "common/Utils",
  "game/Player", "game/Game",
  "browser/UI", "browser/Dialog", "browser/GamesUIMixin",
  "client/ClientUIMixin"
], (
  Platform,
  Utils,
  Player, Game,
  UI, Dialog, GamesUIMixin,
  ClientUIMixin
) => {

  /**
   * Management interface for a database of games.
   * @mixes client/ClientUIMixin
   * @mixes browser/GamesUIMixin
   */
  class ClientGamesUI extends ClientUIMixin(GamesUIMixin(UI)) {

    /**
     * @implements browser/GamesUIMixin#attachUIEventHandlers
     * @override
     */
    attachUIEventHandlers() {

      super.attachUIEventHandlers();

      $("#create-game")
      .on("click", () => Dialog.open("browser/GameSetupDialog", {
        title: $.i18n("Create game"),
        ui: this,
        postAction: "/createGame",
        postResult: () => this.refreshGames(),
        error: this.constructor.report
      }));

      $("#reminder-button")
      .on("click", () => {
        $.post("/sendReminder/*")
        .then(info => $("#alertDialog")
              .text($.i18n.apply(null, info))
              .dialog({
                title: $.i18n("label-send-rem"),
                modal: true
              }))
        .catch(this.constructor.report);
      });

      $("#login-button")
      .on("click", () => Dialog.open("client/LoginDialog", {
        // postAction is dynamic, depends which tab is open
        postResult: () => this.refresh().catch(this.constructor.report),
        error: this.constructor.report
      }));

      $("#logout-button")
      .on("click", () => {
        $.post("/logout")
        .then(result => {
          console.debug("Logged out", result);
          this.session = undefined;
          this.refresh().catch(this.constructor.report);
        })
        .catch(this.constructor.report);
      });

      $("#chpw_button")
      .on("click", () => Dialog.open("client/ChangePasswordDialog", {
        postAction: "/change-password",
        postResult: () => this.refresh().catch(this.constructor.report),
        error: this.constructor.report
      }));
    }

    /**
     * Attach handlers to receive notifications from the server
     */
    attachChannelHandlers() {

      this.channel

      .on(Game.Notify.UPDATE, () => {
        console.debug("b>f update");
        // Can be smarter than this!
        this.refresh().catch(this.constructor.report);
      });

      // Tell the backend we want to receive monitor messages
      this.notifyBackend(Game.Notify.MONITOR);

      return Promise.resolve();
    }

    /**
     * @implements browser/GamesUIMixin#gameOptions
     */
    gameOptions(game) {
      Dialog.open("browser/GameSetupDialog", {
        // use the generic html
        title: $.i18n("Game setup"),
        game: game,
        onSubmit: (dialog, desc) => {
          for (const key of Object.keys(desc))
            game[key] = desc[key];
          $.post("/gameSetup/${game.key}", desc)
          .catch(this.constructor.report);
          this.refreshGame(game.key);
        },
        ui: this,
        error: this.constructor.report
      });
    }

    /**
     * @implements browser/GamesUIMixin#joinGame
     */
    joinGame(game) {
      $.post(`/join/${game.key}`)
      .then(info => {
        const url = `/html/client_game.html?game=${game.key}&player=${this.session.key}`;
        if (this.getSetting("one_window"))
          location.replace(url);
        else {
          window.open(url, "_blank");
          this.refreshGame(game.key);
        }
      })
      .catch(this.constructor.report);
    }

    /**
     * @implements browser/GamesUIMixin#addRobot
     * @inheritdoc
     */
    addRobot(game) {
      Dialog.open("client/AddRobotDialog", {
        ui: this,
        postAction: `/addRobot/${game.key}`,
        postResult: () => this.refreshGame(game.key),
        error: this.constructor.report
      });
    }

    /**
     * @implements browser/GamesUIMixin#invitePlayers
     */
    invitePlayers(game) {
      Dialog.open("client/InvitePlayersDialog", {
        postAction: `/invitePlayers/${game.key}`,
        postResult: names => {
          $("#alertDialog")
          .text($.i18n("sent-invite", names.join(", ")))
          .dialog({
            title: $.i18n("Invitations"),
            modal: true
          });
        },
        error: this.constructor.report
      });
    }

    /**
     * @implements browser/GamesUIMixin#anotherGame
     */
    anotherGame(game) {
      $.post(`/anotherGame/${game.key}`)
      .then(() => this.refreshGames())
      .catch(this.constructor.report);
    }

    /**
     * @implements browser/GamesUIMixin#deleteGame
     */
    deleteGame(game) {
      $.post(`/deleteGame/${game.key}`)
      .then(() => this.refreshGames())
      .catch(this.constructor.report);
    }

    /**
     * @implements browser/GamesUIMixin#observe
     */
    observe(game) {
      const obs = $.i18n("Observe game");
      const ui = this;
      $("#observeDialog")
      .dialog({
        create: function () {
          $(this).find("button[type=submit]")
          .on("click", () => $(this).dialog("close"));
        },
        title: obs,
        closeText: obs,
        modal: true,
        close: function() {
          const name = encodeURIComponent(
            $(this).find("#observerName").val());
          console.debug("Observe game", game.key,
                      "as", name);
          window.open(
            `/html/client_game.html?game=${game.key};observer=${name}`,
            "_blank");
          ui.refreshGame(game.key);
        }
      });
    }

    /**
     * Construct a table row that shows the state of the given player
     * @param {Game|object} game a Game or Game.simple
     * @param {Player} player the player
     * @param {boolean} isActive true if the game isn't over
     */
    $player(game, player, isActive) {

      const $tr = super.$player(game, player, isActive);

      if (!this.session)
        return $tr;

      const $box = $tr.find(".button-box");

      if (player.key === this.session.key) {
        // Currently signed in player
        $box.append(
          $(document.createElement("button"))
          .addClass("risky")
          .attr("name", `leave${game.key}`)
          .button({ label: $.i18n("Leave game") })
          .tooltip({
            content: $.i18n("tt-leave")
          })
          .on("click", () => {
            console.debug(`Leave game ${game.key}`);
            $.post(`/leave/${game.key}`)
            .then(() => this.refreshGame(game.key))
            .catch(this.constructor.report);
          }));

        return $tr;
      }
      else if (player.isRobot) {
        $box.append(
          $(document.createElement("button"))
          .attr("name", "removeRobot")
          .button({ label: $.i18n("Remove robot") })
          .tooltip({
            content: $.i18n("tt-remove-robot")
          })
          .on("click", () => {
            console.debug(`Remove robot from ${game.key}`);
            $.post(`/removeRobot/${game.key}`)
            .then(() => this.refreshGame(game.key))
            .catch(this.constructor.report);
          }));
      }

      // Not the signed in player
      if (this.getSetting("canEmail")
          && !player.isRobot
          && game.whosTurnKey === player.key) {
        $box.append(
          $(document.createElement("button"))
          .attr("name", "email")
          .button({ label: $.i18n("Send reminder") })
          .tooltip({
            content: $.i18n("tt-send-rem")
          })
          .on("click", () => {
            console.debug("Send reminder");
            $.post(`/sendReminder/${game.key}`)
            .then(names => $("#alertDialog")
                  .text($.i18n("player-reminded", names.join(", ")))
                  .dialog({
                    title: $.i18n("player-reminded", player.name),
                    modal: true
                  }))
            .catch(this.constructor.report);
          }));
      }

      return $tr;
    }

    /**
     * @implements browser/GamesUIMixin#showGames
     * @override
     */
    showGames(simples) {
      super.showGames(simples);

      $("#reminder-button").hide();

      if (this.session && this.getSetting("canEmail") && simples.length > 0) {
        const games = simples.map(simple => Game.fromSerialisable(simple, Game));
        if (games.reduce((em, game) => {
          // game is Game.simple, not a Game object
          // Can't remind a game that hasn't started or has ended.
          if (game.hasEnded() || game.state === Game.State.WAITING)
            return em;
          return em || game.getPlayerWithKey(game.whosTurnKey)
          .email;
        }, false))
          $("#reminder-button").show();
      }
    }

    /**
     * @implements browser/GamesUIMixin#getHistory
     */
    getHistory() {
      return $.get("/history");
    }

    /**
     * @implements browser/GamesUIMixin#getGame
     */
    getGame(key) {
      return $.get(`/games/${key}`);
    }

    /**
     * @implements browser/GamesUIMixin#getGames
     */
    getGames(what) {
      return $.get(`/games/${what}`);
    }

    create() {
      return super.create()
      .then(() => this.refreshGames());
    }
  }

  new ClientGamesUI().create();
});
