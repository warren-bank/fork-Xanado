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
  "standalone/StandaloneUIMixin"
], (
  Platform,
  Utils,
  Player, Game,
  UI, Dialog, GamesUIMixin,
  StandaloneUIMixin
) => {

  /**
   * Management interface for a database of games stored in localStorage.
   * @mixes standalone/StandaloneUIMixin
   * @mixes browser/GamesUIMixin
   * @extends UI 
   */
  class StandaloneGamesUI extends StandaloneUIMixin(GamesUIMixin(UI)) {

    /**
     * @implements browser/GamesUIMixin#attachUIEventHandlers
     * @override
     */
    attachUIEventHandlers() {

      $("#showAllGames")
      .on("change", () => this.refreshGames(true));

      $("#create-game")
      .on("click", () => Dialog.open("browser/GameSetupDialog", {
        html: "standalone_GameSetupDialog",
        title: $.i18n("Create game"),
        ui: this,
        onSubmit(dialog, vals) {
          this.ui.createGame(vals)
          .then(game => game.save())
          .then(game => alert(`Created ${game.key}`))
          .then(() => this.ui.refreshGames(true));
        },
        error: this.constructor.report
      }));
    }
    
    /**
     * @implements browser/GamesUIMixin#gameOptions
     * @override
     */
    gameOptions(game) {
      Dialog.open("browser/GameSetupDialog", {
        html: "standalone_GameSetupDialog",
        title: $.i18n("Game setup"),
        game: game,
        onSubmit: (dialog, desc) => {
          for (const key of Object.keys(desc))
            game[key] = desc[key];
          game.save();
          this.refreshGame(game.key, true);
        },
        ui: this,
        error: this.constructor.report
      });
    }

    /**
     * @implements browser/GamesUIMixin#joinGame
     * @override
     */
    joinGame(game) {
      return this.redirectToGame(game.key);
    }

    /**
     * @implements browser/GamesUIMixin#anotherGame
     */
    anotherGame(game) {
      assert.fail("TODO: StandaloneGamesUI.anotherGame");
    }

    /**
     * @implements browser/GamesUIMixin#deleteGame
     */
    deleteGame(game) {
      return this.db.rm(game.key)
      .then(() => this.refreshGames(true));
    }

    /**
     * @implements browser/GamesUIMixin#getGames
     */
    getGames(send) {
      // Make list of keys we are interested in
      return ((send === "all" || send === "active")
              ? this.db.keys()
              : Promise.resolve([send]))
      // Load those games
      .then(keys => Promise.all(
        keys.map(key => this.db.get(key, Game)
                 .then(game => game.onLoad(this.db)))))

      .then(games => Promise.all(
        games
        .filter(game => (send !== "active" || !game.hasEnded()))
        .map(game => game.serialisable(this.userManager))))
      // Sort the resulting list by last activity, so the most
      // recently active game bubbles to the top
      .then(gs => gs.sort((a, b) => a.lastActivity < b.lastActivity ? 1
                          : a.lastActivity > b.lastActivity ? -1 : 0));
    }

    /**
     * @implements browser/GamesUIMixin#getGame
     */
    getGame(key) {
      return this.db.get(key, Game)
      .then(game => game.onLoad(this.db));
    }

    /**
     * Create the UI and start interacting
     */
    create() {
      super.create();

      return this.initTheme()
      .then(() => this.initLocale())
      .then(() => this.attachUIEventHandlers())
      .then(() => {
        this.refreshGames(true);
        $(".loading").hide();
        $(".waiting").removeClass("waiting");
      });
    }
  }

  new StandaloneGamesUI().create();
});
