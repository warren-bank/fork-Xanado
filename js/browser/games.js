/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

/**
 * Browser app for games.html; populate the list of live games
 */
requirejs([
  "platform", "common/Utils",
  "browser/UI", "browser/Dialog",
  "common/Types", "game/Player", "game/Game",
  "jquery"
], (
  Platform, Utils,
  UI, Dialog,
  Types, Player, Game
) => {

  const TWIST_OPEN = "\u25BC";
  const TWIST_CLOSE = "\u25B2";

  const Notify    = Types.Notify;
  const Penalty   = Types.Penalty;
  const State     = Types.State;
  const Timer     = Types.Timer;
  const WordCheck = Types.WordCheck;

  /**
   * Management interface for a database of games.
   * @extends UI
   */
  class GamesUI extends UI {

    constructor() {

      super();

      /**
       * Map of game keys to boolean, true if the game is untwisted (open)
       * @member {object}
       */
      this.isUntwisted = {};

      const untwist = location.search.replace(/^.*[?&;]untwist=([^&;]*).*$/,"$1");
      if (untwist && untwist !== "undefined")
        this.isUntwisted[untwist] = true;
    }

    // @override
    attachHandlers() {
      $("#showAllGames")
      .on("change", () => this.refresh_games());

      $("#reminder-button")
      .on("click", () => {
        console.log("Send reminders");
        $.post("/sendReminder/*")
        .then(info => $("#alertDialog")
              .text($.i18n.apply(null, info))
              .dialog({
                title: $.i18n("Email turn reminders"),
                modal: true
              }))
        .catch(UI.report);
      });

      $("#create-game")
      .on("click", () => Dialog.open("GameSetupDialog", {
        title: $.i18n("Create game"),
        ui: this,
        postAction: "/createGame",
        postResult: () => this.refresh_games(),
        error: UI.report
      }));

      $("#login-button")
      .on("click", () => Dialog.open("LoginDialog", {
        // postAction is dynamic, depends which tab is open
        postResult: () => this.refresh().catch(UI.report),
        error: UI.report
      }));

      $("#logout-button")
      .on("click", () => {
        $.post("/logout")
        .then(result => {
          console.log("Logged out", result);
          this.session = undefined;
          this.refresh().catch(UI.report);
        })
        .catch(UI.report);
      });

      $("#chpw_button")
      .on("click", () => Dialog.open("ChangePasswordDialog", {
        postAction: "/change-password",
        postResult: () => this.refresh().catch(UI.report),
        error: UI.report
      }));

      super.attachHandlers();
    }

    // @override
    readyToListen() {
      return this.refresh();
    }

    // @override
    attachSocketListeners() {
      super.attachSocketListeners();

      this.socket
      .on(Notify.UPDATE, () => {
        console.debug("--> update");
        // Can be smarter than this!
        this.refresh().catch(UI.report);
      });

      // Tell the server we want to receive monitor messages
      this.socket.emit(Notify.MONITOR);
    }

    /**
     * Used by GameDialog
     */
    gameOptions(game) {
      Dialog.open("GameSetupDialog", {
        title: $.i18n("Game setup"),
        game: game,
        onSubmit: dialog => {
          const desc = dialog.getFieldValues();
          game.makeChanges(desc);
          this.refresh_game(game.key);
        },
        ui: this,
        error: UI.report
      });
    }

    /**
     * Used by GameDialog
     */
    joinGame(game) {
      $.post(`/join/${game.key}`)
      .then(info => {
        window.open(`/html/game.html?game=${game.key}&player=${this.session.key}`, "_blank");
        this.refresh_game(game.key);
      })
      .catch(UI.report);
    }

    /**
     * Used by GameDialog
     */
    addRobot(game) {
      Dialog.open("AddRobotDialog", {
        ui: this,
        postAction: `/addRobot/${game.key}`,
        postResult: () => this.refresh_game(game.key),
        error: UI.report
      });
    }

    /**
     * Used by GameDialog
     */
    invitePlayers(game) {
      Dialog.open("InvitePlayersDialog", {
        postAction: `/invitePlayers/${game.key}`,
        postResult: names => {
          $("#alertDialog")
          .text($.i18n("Invited $1", names.join(", ")))
          .dialog({
            title: $.i18n("Invitations"),
            modal: true
          });
        },
        error: UI.report
      });
    }

    /**
     * Used by GameDialog
     */
    anotherGame(game) {
      $.post(`/anotherGame/${game.key}`)
      .then(() => this.refresh_games())
      .catch(UI.report);
    }

    /**
     * Used by GameDialog
     */
    deleteGame(game) {
      $.post(`/deleteGame/${game.key}`)
      .then(() => this.refresh_games())
      .catch(UI.report);
    }

    /**
     * Used by GameDialog
     */
    observe(game) {
      const obs = $.i18n("Observe game");
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
          console.log("Observe game", this.game.key,
                      "as", name);
          window.open(
            `/html/game.html?game=${this.game.key};observer=${name}`,
            "_blank");
          this.refresh_game(this.game.key);
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
      Platform.assert(player instanceof Player);
      const $tr = player.$tableRow();

      if (isActive) {
        if (player.dictionary && player.dictionary !== game.dictionary) {
          const dic = $.i18n("using dictionary $1", player.dictionary);
          $tr.append(`<td>${dic}</td>`);
        }

        if (game.timerType && player.clock) {
          const left = $.i18n("$1s left to play", player.clock);
          $tr.append(`<td>${left}</td>`);
        }

      } else {
        const winningScore = game.getPlayers().reduce(
          (max, p) =>
          Math.max(max, p.score), 0);

        if (player.score === winningScore) {
          $tr.append('<td class="ui-icon icon-winner"></td>');
        }

        return $tr;
      }

      if (!this.session)
        return $tr;

      const $box = $(document.createElement("td"));
      $tr.append($box);

      if (player.key === this.session.key) {
        // Currently signed in player
        $box.append(
          $(document.createElement("button"))
          .attr("name", `join${game.key}`)
          .button({ label: $.i18n("Open game") })
          .tooltip({
            content: $.i18n("Open this game in a new window.")
          })
          .on("click", () => {
            console.log(`Join game ${game.key}/${this.session.key}`);
            $.post(`/join/${game.key}`)
            .then(() => this.joinGame(game))
            .catch(UI.report);
          }));

        $box.append(
          $(document.createElement("button"))
          .addClass("risky")
          .attr("name", `leave${game.key}`)
          .button({ label: $.i18n("Leave game") })
          .tooltip({
            content: $.i18n("If you leave the game your score will still count towards the leader board.")
          })
          .on("click", () => {
            console.log(`Leave game ${game.key}`);
            $.post(`/leave/${game.key}`)
            .then(() => this.refresh_game(game.key))
            .catch(UI.report);
          }));

        return $tr;
      }
      else if (player.isRobot) {
        $box.append(
          $(document.createElement("button"))
          .attr("name", "removeRobot")
          .button({ label: $.i18n("Remove robot") })
          .tooltip({
            content: $.i18n("Remove the robot from this game.")
          })
          .on("click", () => {
            console.log(`Remove robot from ${game.key}`);
            $.post(`/removeRobot/${game.key}`)
            .then(() => this.refresh_game(game.key))
            .catch(UI.report);
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
            content: $.i18n("Email a reminder to player whose turn it is")
          })
          .on("click", () => {
            console.log("Send reminder");
            $.post(`/sendReminder/${game.key}`)
            .then(names => $("#alertDialog")
                  .text($.i18n(/*i18n*/"Reminded $1", names.join(", ")))
                  .dialog({
                    title: $.i18n("Reminded $1", player.name),
                    modal: true
                  }))
            .catch(UI.report);
          }));
      }

      return $tr;
    }

    /**
     * Headline is the text shown in the game table and the head
     * of the game dialog.
     * @param {Game} game the game to headline
     * @param {boolean} inTable true if this is being prepared for the
     * table, false for the dialog.
     */
    $headline(game, inTable) {
      const headline = [ game.edition ];

      if (inTable) {
        if (game.getPlayers().length > 0)
          headline.push($.i18n(
            "players $1",
            Utils.andList(game.getPlayers().map(p => p.name))));
        headline.push($.i18n(
          "created $1",
          new Date(game.creationTimestamp).toDateString()));
      }

      const isActive = !game.hasEnded();

      const $h = $(document.createElement("span"))
            .addClass("headline")
            .attr("name", game.key)
            .text(headline.join(", "));

      if (!isActive)
        $h.append(
          $(document.createElement("span"))
          .addClass("game-state")
          .text($.i18n(game.state)))
        .append(
          $(document.createElement("span"))
          .addClass("who-won")
          .text($.i18n("who-won", game.getWinner().name)));
      return $h;
    }

    /**
     * Construct a table that shows the state of the given game
     * @param {Game|object} game a Game or Game.simple
     */
    $game(game) {
      Platform.assert(game instanceof Game);
      return $(`<div class="game" id="${game.key}"></div>`)
      .append(this.$headline(game, true))
      .on("click", () => {
        Dialog.open("GameDialog", {
          game: game,
          ui: this
        });
      });
    }

    /**
     * Refresh the display of a single game
     * @param {Game|object} game a Game or Game.simple
     */
    show_game(game) {
      console.log(`Reshow ${game.key}`);
      // Update the games list and dialog headlines as appropriate
      $(`#${game.key}`).replaceWith(this.$headline(game));
      // Update the dialog if appropriate
      $(`#GameDialog[name=${game.key}]`)
      .data("this")
      .populate(game);
    }

    /**
     * Refresh the display of all games
     * @param {object[]} games array of Game.simple
     */
    show_games(simples) {
      if (simples.length === 0) {
        $("#gamesList").hide();
        return;
      }

      const $gt = $("#gamesTable");
      $gt.empty();

      const games = simples.map(simple => Game.fromSerialisable(simple));

      games.forEach(game => $gt.append(this.$game(game)));

      $("#gamesList").show();
      $("#reminder-button").hide();
      if (this.session && this.getSetting("canEmail")) {
        if (games.reduce((em, game) => {
          // game is Game.simple, not a Game object
          // Can't remind a game that hasn't started or has ended.
          if (game.hasEnded() || game.state === State.WAITING)
            return em;
          return em || game.getPlayerWithKey(game.whosTurnKey)
          .email;
        }, false))
          $("#reminder-button").show();
      }
    }

    /**
     * Request an update for a single game (which must exist in the
     * games table)
     * @param {string} key Game key
     */
    refresh_game(key) {
      return $.get(`/games/${key}`)
      .then(simple => this.show_game(Game.fromSerialisable(simple[0])))
      .catch(UI.report);
    }

    /**
     * Request an update for all games
     */
    refresh_games() {
      console.debug("refresh_games");
      const what = $("#showAllGames").is(":checked") ? "all" : "active";
      return $.get(`/games/${what}`)
      .then(games => this.show_games(games))
      .catch(UI.report);
    }

    /**
     * Request an update for session status and all games lists
     * @return {Promise} promise that resolves when all AJAX calls
     * have completed
     */
    refresh() {
      console.debug("refresh");
      return Promise.all([
        this.getSession()
        .then(session => {
          if (session) {
            $("#create-game").show();
            $("#chpw_button").toggle(session.provider === "xanado");
          } else {
            $("#create-game").hide();
          }
        })
        .then(() => this.refresh_games()),

        $.get("/history")
        .then(data => {
          if (data.length === 0) {
            $("#gamesCumulative").hide();
            return;
          }
          let n = 1;
          $("#gamesCumulative").show();
          const $gt = $("#playerList");
          $gt.empty();
          data.forEach(player => {
            const s = $.i18n(
              "$1: <b>$2</b>: $3 ($5 win{{PLURAL:$5||s}} from $4 game{{PLURAL:$4||s}})", n++, player.name, player.score,
              player.games, player.wins);
            $gt.append(`<div class="player-cumulative">${s}</div>`);
          });
        })
      ]);
    }
  }

  new GamesUI().create();
});
