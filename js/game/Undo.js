/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define([
  "platform", "common/Utils", "game/Types", "game/Tile"
], (
  Platform, Utils, Types, Tile
) => {

  const Turns  = Types.Turns;
  const State  = Types.State;
  const Notify = Types.Notify;

  /**
   * Mixin that provides Undo functionality for Game
   * @mixin Undo
   */
  return {

    /**
     * Take tiles out of the letter bag and put them back on the rack
     * @function
     * @memberof Undo
     * @param {Tile[]} tiles list of tiles
     * @param {Rack} rack to put the tiles on
     */
    bag2rack(tiles, rack) {
      for (const tile of tiles) {
        const removed = this.letterBag.removeTile(tile);
        Platform.assert(removed, `${Utils.stringify(tile)} missing from bag`);
        rack.addTile(removed);
      }
    },

    /**
     * Move tiles from the board back to the rack
     * @function
     * @memberof Undo
     * @param {Tile[]} tiles list of tiles
     * @param {Rack} rack to put the tiles on
     */
    board2rack(tiles, rack) {
      for (const pl of tiles) {
        const sq = this.board.at(pl.col, pl.row);
        Platform.assert(sq, "Bad placement");
        const t = sq.unplaceTile();
        rack.addTile(t);
      }
    },

    /**
     * Move tiles from the rack to the board
     * @function
     * @memberof Undo
     * @param {Tile[]} tiles list of tiles
     * @param {Rack} rack to get the tiles from
     */
    rack2board(tiles, rack) {
      // Move tiles from the rack back onto the board
      for (const place of tiles) {
        const tile = rack.removeTile(place);
        Platform.assert(tile);
        const square = this.board.at(place.col, place.row);
        Platform.assert(square && !square.tile);
        square.placeTile(tile, true);
      }
    },

    /**
     * Undo a swap. Resets the game state as if it had never happened.
     * @function
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unswap(turn, isClient) {
      this.state = State.PLAYING;
      const player = this.getPlayerWithKey(turn.playerKey);
      const racked = player.rack.removeTiles(turn.replacements);
      this.bag2rack(turn.placements, player.rack);
      this.letterBag.returnTiles(racked);
      player.passes--;
      this.whosTurnKey = player.key;
      if (isClient)
        player.rack.$refresh();
    },

    /**
     * Undo a play. Resets the game state as if it had never happened.
     * @function
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unplay(turn, isClient) {
      this.state = State.PLAYING;
      const player = this.getPlayerWithKey(turn.playerKey);
      const racked = player.rack.removeTiles(turn.replacements);
      this.board2rack(turn.placements, player.rack);
      this.letterBag.returnTiles(racked);
      player.score -= turn.score;
      player.passes = turn.prepasses || 0;
      this.whosTurnKey = player.key;
      if (isClient) {
        player.rack.$refresh();
        this.board.$refresh();
      }
    },

    /**
     * Undo a game over confirmation.
     * Resets the game state as if it had never happened.
     * @function
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unconfirmGameOver(turn, isClient) {
      // Re-adjustscores from the delta
      for (const key of Object.keys(turn.score)) {
        const delta = turn.score[key];
        const player = this.getPlayerWithKey(key);
        Platform.assert(player, key);
        player.score -= (delta.time || 0) + (delta.tiles || 0);
      }
      this.state = State.PLAYING;
      // TODO: Notify
      // TODO: reset the clock
    },

    /**
     * Undo a TOOK_BACK or CHALLENGE_WON.
     * Resets the game state as if it had never happened.
     * @function
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    untakeBack(turn, isClient) {
      this.state = State.PLAYING;
      const player = this.getPlayerWithKey(turn.playerKey);
      this.rack2board(turn.placements, player.rack);
      this.bag2rack(turn.replacements, player.rack);
      player.score -= turn.score;
      this.whosTurnKey = this.nextPlayer(player).key;
      this._debug(`\tplayer now ${this.whosTurnKey}`,turn);
      if (isClient) {
        player.rack.$refresh();
        this.board.$refresh();
      }
    },

    /**
     * Undo a pass. Resets the game stat as if it had never happened.
     * @function
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unpass(turn, isClient) {
      this.state = State.PLAYING;
      const player = this.getPlayerWithKey(turn.playerKey);
      player.passes--;
      this.whosTurnKey = player.key;
      // TODO: Notify
    },

    /**
     * Unplay a LOST challenge (won challenges are handled in untakeBack).
     * Resets the game state as if it had never happened.
     * @function
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unchallenge(turn, isClient) {
      const player = this.getPlayerWithKey(turn.challengerKey);
      this._debug("\t", Utils.stringify(player), "regained", turn.score);
      player.score -= turn.score;
      // TODO: Notify
    },

    /**
     * Undo the most recent turn. Resets the play state as if the turn had never
     * happened. Sends a Notify.UNDONE to all listeners, passing the Turn
     * that was unplayed.
     * @function
     * @memberof Undo
     * @param {boolean?} isClient if true, updates the UI associated with the board
     * and rack. If false, saves the game.
     * @return {Promise} promise resolving to undefined
     */
    undo(isClient) {
      Platform.assert(this.turnCount() > 0);
      const turn = this.popTurn();
      this._debug(`un-${turn.type}`);
      switch (turn.type) {
      case Turns.SWAPPED:
        this.unswap(turn, isClient);
        break;
      case Turns.PASSED:
      case Turns.TIMED_OUT:
        this.unpass(turn, isClient);
        break;
      case Turns.PLAYED:
        this.unplay(turn, isClient);
        break;
      case Turns.TOOK_BACK:
      case Turns.CHALLENGE_WON:
        this.untakeBack(turn, isClient);
        break;
      case Turns.GAME_ENDED:
        this.unconfirmGameOver(turn, isClient);
        break;
      case Turns.CHALLENGE_LOST:
        this.unchallenge(turn, isClient);
        break;
      default:
        Platform.fail(`Unknown turn type '${turn.type}'`);
      }
      if (isClient)
        return Promise.resolve();

      return this.save()
      .then(() => this.notifyAll(Notify.UNDONE, turn));
    },

    /**
     * Replay the given turn back into the game
     * @function
     * @memberof Undo
     * @return {Promise} promise resolving to undefined
     */
    redo(turn) {
      const player = this.getPlayerWithKey(turn.playerKey);
      this._debug("REDO", turn.type, new Date(turn.timestamp).toISOString());
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
