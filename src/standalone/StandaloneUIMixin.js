/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

import "jquery/dist/jquery.js";
import "jquery-ui/dist/jquery-ui.js";

import { Game } from "../game/Game.js";
const Player = Game.CLASSES.Player;
import { Edition } from "../game/Edition.js";
import { BackendGame } from "../backend/BackendGame.js";
import { BrowserDatabase } from "../browser/BrowserDatabase.js";
import { UI } from "../browser/UI.js";

/**
 * Mixin with common code shared between client game and games interfaces
 * (client/ClientGamesUI.js and client/ClientGameUI.js) but NOT used by
 * standalone.
 * @mixin standalone/StandaloneUIMixin
 */
const StandaloneUIMixin = superclass => class extends superclass {

  /**
   * Format of entries in the games table.
   * See {@linkcode browser/BrowserGame#headline}
   * @override
   */
  static GAME_TABLE_ROW = '<tr class="game" id="%k">'
  + '<td class="h-key">%k</td>'
  + '<td class="h-edition">%e</td>'
  + '<td class="h-last-play">%l</td>'
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
  db = new BrowserDatabase(BackendGame);

  /**
   * There can be only one (player)
   */
  session = { key: null };

  /**
   * Arguments passed in the URL and parsed out using
   * {@linkcode UI#parseURLArguments}
   * @member {object}
   */
  args = undefined;

  /**
   * @implements UI#getSession
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  getSession() {
    if (this.session)
      return Promise.resolve(this.session);
    return Promise.reject();
  }

  /**
   * @implements UI#getHistory
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  getHistory() {
  }

  /**
   * @implements UI#getGameDefaults
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  getGameDefaults() {
    return Promise.resolve(this.constructor.DEFAULTS);
  }

  /**
   * @implements UI#getSetting
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  getSetting(key) {
    return localStorage.getItem(`XANADO${key}`)
    || this.constructor.DEFAULTS[key];
  }

  /**
   * @implements UI#setSetting
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  setSetting(key, value) {
    localStorage.setItem(`XANADO${key}`, value);
  }

  /**
   * @implements UI#getCSS
   * @memberof standalone/StandaloneUIMixin
   * @instance
   * @override
   */
  getCSS() {
    return $.get("../css/index.json");
  }

  /**
   * @implements UI#getLocales
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  getLocales() {
    return $.get("../i18n/index.json");
  }

  /**
   * @implements UI#getEditions
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  getEditions() {
    return $.get(`../editions/index.json`);
  }

  /**
   * @implements UI#getDictionaries
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  getDictionaries() {
    return $.get(`../dictionaries/index.json`);
  }

  /**
   * @implements browser/GameUIMixin#getEdition
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @override
   */
  getEdition(ed) {
    return Edition.load(ed);
  }

  /**
   * Create a new game using the options passed.
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @param {object} vals game setup options
   * @return {Promise} resolves to the created game
   */
  createGame(setup) {
    return Edition.load(setup.edition)
    .then(() => new BackendGame(setup).create())
    .then(game => game.onLoad(this.db))
    .then(game => {
      const robot = new Player({
        name: $.i18n("Robot"),
        key: this.constructor.ROBOT_KEY,
        isRobot: true
      }, BackendGame.CLASSES);

      const human = new Player({
        name: $.i18n("You"),
        key: this.constructor.HUMAN_KEY,
        isRobot: false
      }, BackendGame.CLASSES);

      game.addPlayer(robot, true);
      game.addPlayer(human, true);

      if (Math.random() > 0.5)
        game.whosTurnKey = this.constructor.HUMAN_KEY;
      else
        game.whosTurnKey = this.constructor.ROBOT_KEY;

      game.state = Game.State.PLAYING;

      return game;
    });
  }

  /**
   * Change the URL to a new URL calculated to open the game with the
   * given key (which must have been saved)
   * @instance
   * @memberof standalone/StandaloneUIMixin
   * @param {Key} key the key for the game to switch to
   */
  redirectToGame(key) {
    const parts = UI.parseURLArguments(window.location.toString());
    parts._URL = parts._URL.replace(/standalone_games./, "standalone_game.");
    parts.game = key;
    window.location = UI.makeURL(parts);
  }

  /**
   * Start the process of constructing the UI. Subclasses should
   * continue this process in their own create() methods.
   * @instance
   * @memberof standalone/StandaloneUIMixin
   */
  create() {
    this.args = UI.parseURLArguments(document.URL);
    if (this.args.debug)
      this.debug = console.debug;

    this.session.key = this.constructor.HUMAN_KEY;
  }
};

export { StandaloneUIMixin }
