/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */
/* global pluralRuleParser */

define([
  "platform",
  "common/Utils", "common/Fridge",
  "game/Player", "game/Edition",
  "backend/BackendGame",
  "dawg/Dictionary",
  "browser/BrowserDatabase",

  "jquery", "jqueryui"
], (
  Platform,
  Utils, Fridge,
  Player, Edition,
  BackendGame,
  Dictionary,
  BrowserDatabase
) => {

  /**
   * Mixin with common code shared between client game and games interfaces
   * (client/ClientGamesUI.js and client/ClientGameUI.js) but NOT used by
   * standalone.
   * @mixin standalone/StandaloneUIMixin
   */
  return superclass => class StandaloneUIMixin extends superclass {

    /**
     * Format of entries in the games table.
     * See {@linkcode browser/BrowserGame#headline}
     * @override
     */
    static GAME_TABLE_ROW = '<tr class="game" id="%k">'
    + '<td class="h-key">%k</td>'
    + '<td class="h-edition">%e</td>'
    + '<td class="h-created">%c</td>'
    + '<td class="h-state">%s</td>'
    + '</tr>';

    /**
     * Key for the robot player
     */
    static ROBOT_KEY = "Computer";

    /**
     * Key for the human player
     */
    static HUMAN_KEY = "You";

    /**
     * Game defaults, for getGameDefaults
     * @member {object}
     */
    static DEFAULTS = {
	    edition: "English_Scrabble",
	    dictionary: "British_English",
      one_window: false,
      // User settings
	    notification: false,
	    theme: "default",
	    warnings: true,
	    cheers: true,
	    tile_click: true,
      turn_alert: true,
      // for ease of debug, frontend and backend racks should be the same
      syncRacks: true
    };

    /**
     * The database that will be used for saving and reading games
     * @member {BrowserDatabase}
     */
    db = new BrowserDatabase();

    /**
     * There can be only one (player)
     */
    session = { key: null };

    /**
     * Arguments passed in the URL and parsed out using
     * {@linkcode Utils#parseURLArguments}
     * @member {object}
     */
    args = undefined;

    /**
     * @implements UI
     * @instance
     * @memberof browser/GameUIMixin
     * @override
     */
    getSession() {
      return Promise.resolve(this.session);
    }

    /**
     * @implements UI
     * @instance
     * @memberof browser/GameUIMixin
     * @override
     */
    getHistory() {
    }

    /**
     * @implements UI
     * @instance
     * @memberof browser/GameUIMixin
     * @override
     */
    getGameDefaults() {
      return Promise.resolve(this.constructor.DEFAULTS);
    }

    /**
     * @implements UI
     * @instance
     * @memberof StandaloneUIMixin
     * @override
     */
    getSetting(key) {
      return localStorage.getItem(`XANADO${key}`)
      || this.constructor.DEFAULTS[key];
    }

    /**
     * @implements UI
     * @instance
     * @memberof StandaloneUIMixin
     * @override
     */
    setSetting(key, value) {
      localStorage.setItem(`XANADO${key}`, value);
    }

    /**
     * @implements UI
     * @instance
     * @memberof StandaloneUIMixin
     * @override
     */
    getThemes() {
      return $.get("../css/index.json");
    }

    /**
     * @implements UI
     * @instance
     * @memberof StandaloneUIMixin
     * @override
     */
    getLocales() {
      return $.get("../i18n/index.json");
    }

    /**
     * @implements UI
     * @instance
     * @memberof StandaloneUIMixin
     * @override
     */
    getEditions() {
      return $.get(`../editions/index.json`);
    }

    /**
     * @implements UI
     * @instance
     * @memberof StandaloneUIMixin
     * @override
     */
    getDictionaries() {
      return $.get(`../dictionaries/index.json`);
    }

    /**
     * @implements browser/GameUIMixin
     * @instance
     * @memberof StandaloneUIMixin
     * @override
     */
    getDictionary(dict) {
      return Dictionary.load(dict);
    }

    /**
     * @implements browser/GameUIMixin
     * @instance
     * @memberof StandaloneUIMixin
     * @override
     */
    getEdition(ed) {
      return new Promise((resolve, reject) => {
        requirejs([`editions/${ed}`],
                  edition => resolve(edition));
      });
    }

    /**
     * Create a new game using the options passed.
     * @instance
     * @memberof StandaloneUIMixin
     * @param {object} vals game setup options
     * @return {Promise} resolves to the created game
     */
    createGame(setup) {
      return Edition.load(setup.edition)
      .then(edition => new BackendGame(setup).create())
      .then(game => game.onLoad(this.db))
      .then(game => {
        const robot = new Player({
          name: $.i18n("Robot"),
          key: this.constructor.ROBOT_KEY,
          isRobot: true
        }, BackendGame);

        const human = new Player({
          name: $.i18n("You"),
          key: this.constructor.HUMAN_KEY,
          isRobot: false
        }, BackendGame);

        game.addPlayer(robot, true);
        game.addPlayer(human, true);

        if (Math.random() > 0.5)
          game.whosTurnKey = this.constructor.HUMAN_KEY;
        else
          game.whosTurnKey = this.constructor.ROBOT_KEY;

        game.state = game.constructor.State.PLAYING;

        return game;
      });
    }

    /**
     * Change the URL to a new URL calculated to open the game with the
     * given key (which must have been saved)
     * implements browser/GameUIMixin
     * @instance
     * @memberof StandaloneUIMixin
     * @override
     * @param {Key} key the key for the game to switch to
     */
    redirectToGame(key) {
      const parts = Utils.parseURLArguments(window.location.toString());
      parts._URL = parts._URL.replace(/standalone_games./, "standalone_game.");
      parts.game = key;
      window.location = Utils.makeURL(parts);
    }

    /**
     * Start the process of constructing the UI. Subclasses should
     * continue this process in their own create() methods.
     */
    create() {
      this.args = Utils.parseURLArguments(document.URL);
      if (this.args.debug) {
        this.debugging = true;
        this.debug = console.debug;
      }

      this.session.key = this.constructor.HUMAN_KEY;
    }
  };
});
