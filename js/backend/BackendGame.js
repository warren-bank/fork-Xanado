/*Copyright (C) 2021-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define([
  "platform", "common/Utils",
  "game/Game", "game/Undo", "game/Replay", "game/Commands",
  "backend/BackendBoard"
], (
  Platform, Utils,
  Game, Undo, Replay, Commands,
  BackendBoard
) => {

  /**
   * Back end implementation of {@linkcode Game}.
   * The back end is where the game logic is implemented. It is agnostic
   * as to where it is run - it must work in node.js or a browser.
   * @mixes game/Undo
   * @mixes game/Replay
   * @mixes game/Commands
   * @extends Game
   */
  class BackendGame extends Undo(Replay(Commands(Game))) {

    /**
     * @see Tagger
     */
    static UNFREEZABLE = true;

    /**
     * @override
     */
    static Board = BackendBoard;

    /**
     * @override
     */
    static Game = BackendGame;

   /**
     * Used for testing only.
     * @function
     * @instance
     * @memberof server/GameMixin
     * @param sboard string representation of a game {@linkcode Board}
     * @return {Promise} resolving to `this`
     */
    loadBoard(sboard) {
      return this.getEdition()
      .then(ed => this.board.parse(this.constructor, ed, sboard))
      .then(() => this);
    }

    /**
     * Check if the game has timed out due to inactivity.
     * Stops game timers and sets the state of the game if it has.
     * @function
     * @instance
     * @memberof server/GameMixin
     * @return {Promise} resolves to the game when timeout has
     * been checked
     */
    checkAge() {
      const ageInDays =
            (Date.now() - this.lastActivity())
            / 60000 / 60 / 24;

      if (ageInDays <= 14)
        return Promise.resolve(this); // still active

      this._debug("Game", this.key, "timed out");

      this.state = Game.TIMED_OUT;
      return this.save();
    }
  }

  return BackendGame;
});
