/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define([
  "platform", "common/Utils", "common/Types", "game/Tile"
], (
  Platform, Utils, Types, Tile
) => {

  const Turns  = Types.Turns;
  const State  = Types.State;
  const Notify = Types.Notify;

  /**
   * Methods that provide undo/redo functionality for
   * {@linkcode Game}
   * @mixin Undo
   */
  return superclass => class Undo extends superclass {

    /**
     * Undo a swap. Resets the game state as if it had never happened.
     * @function
     * @instance
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @param {boolean?} quiet if true, don't perform any saves
     * or notifications.
     */
    unswap(turn, quiet) {
      this.state = State.PLAYING;
      const player = this.getPlayerWithKey(turn.playerKey);
      this.rackToBag(turn.replacements, player);
      this.bagToRack(turn.placements, player);
      player.passes--;
      this.whosTurnKey = player.key;
    }

    /**
     * Undo a play. Resets the game state as if it had never happened.
     * @function
     * @instance
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @param {boolean?} quiet if true, don't perform any saves
     * or notifications.
     */
    unplay(turn, quiet) {
      this.state = State.PLAYING;
      const player = this.getPlayerWithKey(turn.playerKey);
      this.rackToBag(turn.replacements, player);
      this.boardToRack(turn.placements, player);
      player.score -= turn.score;
      player.passes = turn.prepasses || 0;
      this.whosTurnKey = player.key;
    }

    /**
     * Undo a game over confirmation.
     * Resets the game state as if it had never happened.
     * @function
     * @instance
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @param {boolean?} quiet if true, don't perform any saves
     * or notifications.
     */
    unconfirmGameOver(turn, quiet) {
      // Re-adjustscores from the delta
      for (const key in turn.score) {
        const delta = turn.score[key];
        const player = this.getPlayerWithKey(key);
        Platform.assert(player, key);
        player.score -= (delta.time || 0) + (delta.tiles || 0);
      }
      this.state = State.PLAYING;
      // TODO: Notify
      // TODO: reset the clock
    }

    /**
     * Undo a TOOK_BACK or CHALLENGE_WON.
     * Resets the game state as if it had never happened.
     * @function
     * @instance
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @param {boolean?} quiet if true, don't perform any saves
     * or notifications.
     */
    untakeBack(turn, quiet) {
      this.state = State.PLAYING;
      const player = this.getPlayerWithKey(turn.playerKey);
      this.rackToBoard(turn.placements, player);
      this.bagToRack(turn.replacements, player);
      player.score -= turn.score;
      this.whosTurnKey = this.nextPlayer(player).key;
      this._debug(`\tplayer now ${this.whosTurnKey}`,turn);
    }

    /**
     * Undo a pass. Resets the game stat as if it had never happened.
     * @function
     * @instance
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @param {boolean?} quiet if true, don't perform any saves
     * or notifications.
     */
    unpass(turn, quiet) {
      this.state = State.PLAYING;
      const player = this.getPlayerWithKey(turn.playerKey);
      player.passes--;
      this.whosTurnKey = player.key;
      // TODO: Notify
    }

    /**
     * Unplay a LOST challenge (won challenges are handled in untakeBack).
     * Resets the game state as if it had never happened.
     * @function
     * @instance
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @param {boolean?} quiet if true, don't perform any saves
     * or notifications.
     */
    unchallenge(turn, quiet) {
      const player = this.getPlayerWithKey(turn.challengerKey);
      this._debug("\t", Utils.stringify(player), "regained", turn.score);
      player.score -= turn.score;
      // TODO: Notify
    }

    /**
     * Undo the most recent turn. Resets the play state as if the turn
     * had never happened. Sends a Notify.UNDONE to all listeners,
     * passing the Turn that was unplayed.
     * @function
     * @instance
     * @memberof Undo
     * @param {Turn} turn the turn to undo
     * @param {boolean?} quiet if true, don't perform any saves
     * or notifications.
     * the board and rack. If false, saves the game.
     * @return {Promise} promise resolving to undefined
     */
    undo(turn, quiet) {
      this._debug(`un-${turn.type}`);
      switch (turn.type) {
      case Turns.SWAPPED:
        this.unswap(turn, quiet);
        break;
      case Turns.PASSED:
      case Turns.TIMED_OUT:
        this.unpass(turn, quiet);
        break;
      case Turns.PLAYED:
        this.unplay(turn, quiet);
        break;
      case Turns.TOOK_BACK:
      case Turns.CHALLENGE_WON:
        this.untakeBack(turn, quiet);
        break;
      case Turns.GAME_ENDED:
        this.unconfirmGameOver(turn, quiet);
        break;
      case Turns.CHALLENGE_LOST:
        this.unchallenge(turn, quiet);
        break;
      default:
        Platform.fail(`Unknown turn type '${turn.type}'`);
      }

      if (quiet)
        return Promise.resolve();

      return this.save()
      .then(() => this.notifyAll(Notify.UNDONE, turn));
    }

    /**
     * Replay the given turn back into the game
     * @function
     * @instance
     * @memberof Undo
     * param {Turn} trun turn to redo
     * @return {Promise} promise resolving to undefined
     */
    redo(turn) {
      const player = this.getPlayerWithKey(turn.playerKey);
      this._debug("REDO", turn.type, turn);
      switch (turn.type) {
      case Turns.SWAPPED:
        // Remove and return the expected tiles to the the unshaken bag
        // to ensure replay order. We have to do this so the next play on the
        // undo stack is also redoable.
        this.letterBag.predictable = true;
        this.letterBag.removeTiles(turn.replacements);
        this.letterBag.returnTiles(turn.replacements.map(t => new Tile(t)));
        this._debug("\t-- swap");
        return this.swap(player, turn.placements)
        .then(() => delete this.letterBag.predictable);
      case Turns.PLAYED:
        this.letterBag.predictable = true;
        // Remove and return
        this.letterBag.removeTiles(turn.replacements);
        this.letterBag.returnTiles(turn.replacements.map(t => new Tile(t)));
        this._debug("\t-- play");
        return this.play(player, turn)
        .then(() => delete this.letterBag.predictable);
      case Turns.PASSED:
      case Turns.TIMED_OUT:
        this._debug("\t-- pass");
        return this.pass(player, turn.type);
      case Turns.TOOK_BACK:
        this._debug("\t-- takeBack");
        return this.takeBack(player, turn.type);
      case Turns.CHALLENGE_WON:
      case Turns.CHALLENGE_LOST:
        this._debug("\t-- challenge");
        return this.challenge(
          this.getPlayerWithKey(turn.challengerKey), player);
      case Turns.GAME_ENDED:
        this._debug("\t-- confirmGameOver");
        return this.confirmGameOver(player, turn.endState);
      }
      /* istanbul ignore next */
      return Platform.assert(false, `Unrecognised turn type ${turn.type}`);
    }
  };
});
