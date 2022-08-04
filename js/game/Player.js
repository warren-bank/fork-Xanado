/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, jquery */

define([
  "platform", "common/Types", "game/Rack",
  requirejs.isBrowser ? "browser/Player" : "common/Mixin"
], (Platform, Types, Rack, Mixin) => {

  const Timer = Types.Timer;

  /**
   * A player in a {@linkcode Game}. Player objects are specific to
   * a single game, and are used on both browser and server sides.
   * @mixes BrowserPlayer
   */
  class Player {

    /**
     * @param {object} params named parameters, or other Player
     * object to copy. `name` and `key ` are required. Any of `_debug`,
     * `isRobot`, `canChallenge`, `wantsAdvice`,`dictionary` or
     * `missNextTurn` can be passed. The player will be initialised with
     * an empty rack (no squares).
     */
    constructor(params) {
      /**
       * Player unique key. Required.
       * @member {Key}
       */
      this.key = params.key;

      /**
       * Player name. Required.
       * @member {string}
       */
      this.name = params.name;

      /**
       * Rack of tiles. By default an 8-cell rack is created, but
       * this will be replaced on a call to fillRack, as
       * it's only then we know how big it has to be.
       * @member {Rack}
       */
      this.rack = new Rack(`Rack_${this.key}`, 8);

      /**
       * Number of times this player has passed (or swapped)
       * since the last non-pass/swap play.
       * @member {number}
       */
      this.passes = 0;

      /**
       * Player's current score.
       * @member {number}
       */
      this.score = 0;

      if (params.clock)
        /**
         * Player countdown clock. In games with `timerType` `TIMER_TURN`,
         * this is the number of seconds before the player's turn times
         * out (if they are the current player). For `TIMER_GAME` it's
         * the number of seconds before the chess clock runs out.
         * Setting and management is done in {@linkcode Game}
         * @member {number?}
         */
        this.clock = 0;

      if (params._isConnected)
        /**
         * Whether the server thinks the player is connected or not.
         * Not serialised.
         * @member {boolean}
         */
        this._isConnected = true;

      if (params.missNextTurn)
        /**
         * True if this player is due to miss their next play due
         * to a failed challenge. Default is false.
         * @member {boolean?}
         */
        this.missNextTurn = true;

      if (params.wantsAdvice)
        /**
         * Set true to advise human player of better plays than the one
         * they used. Default is false.
         * @member {boolean}
         */
        this.wantsAdvice = true;

      if (params.isRobot)
        /**
         * Is player a robot? Default is false.
         * @member {boolean}
         */
        this.isRobot = true;

      if (params.canChallenge)
        /**
         * Can robot player challenge? Default is false.
         * @member {boolean}
         */
        this.canChallenge = true;

      if (params.dictionary)
        /**
         * Name of (or path to) the dictionary the robot will use. Defaults to
         * the game dictionary. Only used for findBestPlay for robot players.
         * Default is undefined.
         * @member {string?}
         */
        this.dictionary = params.dictionary;

      if (typeof params._debug === "function")
        /**
         * Debug function
         * @member {function}
         */
        this._debug = params._debug;
      else
        this._debug = () => {};
    }

    /**
     * Create simple flat structure describing a subset of the player
     * state. This is used for sending minimal player information to
     * the `games` interface using JSON.
     * @param {Game} game the game the player is participating in
     * @param {UserManager?} um user manager for getting emails if wanted
     * @return {Promise} resolving to a simple structure describing 
     * the player
     */
    simple(game, um) {
      return ((this.isRobot || !um)
              ? Promise.resolve(this)
              : um.getUser({ key: this.key }).catch(e => this))
      .then(ump => {
        const simple = {
          name: this.name,
          key: this.key,
          score: this.score
        };
        if (this.isRobot) simple.isRobot = true;
        if (this._isConnected) simple._isConnected = true;
        if (this.dictionary) simple.dictionary = this.dictionary;
        if (this.clock) simple.clock = this.clock;
        
        // Can they be emailed?
        if (ump.email) simple.email = true;

        if (this.missNextTurn) simple.missNextTurn = true;

        return simple;
      });
    }

    /**
     * Construct a player object from a simple() structure
     */
    static fromSimple(simple) {
      const player = new Player(simple);
      if (simple.passes)
        player.passes = simple.passes;
      if (simple.score)
        player.score = simple.score;
      if (simple.clock)
        player.clock = simple.clock;
      return player;
    }

    /**
     * Draw an initial rack from the letter bag. Server side only.
     * @param {LetterBag} letterBag LetterBag to draw tiles from
     * @param {number} rackSize size of the rack
     */
    fillRack(letterBag, rackSize) {
      // +1 to allow space for tile sorting in the UI
      // Use the player key for the rack id, so we can maintain
      // unique racks for different players
      this.rack = new Rack(`Rack_${this.key}`, rackSize + 1);
      for (let i = 0; i < rackSize; i++)
        this.rack.addTile(letterBag.getRandomTile());
      this.score = 0;
    }

    /**
     * Return all tiles to the letter bag.
     * @param {LetterBag} letterBag LetterBag to return tiles to
     */
    returnTiles(letterBag) {
      for (let tile of this.rack.tiles())
        letterBag.returnTile(this.rack.removeTile(tile));
    }

    /**
     * Handle a tick of the server clock.
     */
    tick() {
      this.clock--;
      this._debug("Tick", this.name, this.clock);
      if (this.clock <= 0 && typeof this._onTimeout === "function") {
        this._debug(this.name, "has timed out at", new Date());
        this._onTimeout();
        // Timeout only happens once!
        delete this._onTimeout;
      }
    }

    /**
     * Set a timeout for the player, which will be triggered when the
     * clock reaches exactly 0. The timeout is only triggered once for
     * a call to setTimeout, resetting the clock will not invoke it
     * again.
     * @param {number} time number of seconds before timeout
     * @param {function} onTimeout a function() invoked if the
     * timer expires, ignored if time undefined
     */
    setTimeout(time, onTimeout) {
      this._debug(this.name, `turn timeout in ${time}s`);
      this.clock = time;
      this._onTimeout = onTimeout;
    }

    /**
     * Generate debug representation
     */
    stringify() {
      let s = `Player '${this.name}'`;
      if (this.isRobot)
        s += " (Robot)";
      if (this.key)
        s += ` key ${this.key}`;
      return s;
    }

    /**
     * Toggle wantsAdvice on/off
     */
    toggleAdvice() {
      this.wantsAdvice = !this.wantsAdvice;
    }

  }

  if (Mixin)
    Object.assign(Player.prototype, Mixin);

  return Player;
});
