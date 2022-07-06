/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define("game/Undo", [
	"platform", "game/Types", "game/Tile"
], (
	Platform, Types, Tile
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
        Platform.assert(removed, `${tile.toString()} missing from bag`);
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
    unswap(turn) {
      this.state = State.PLAYING;
      const player = this.getPlayer(turn.playerKey);
      const racked = player.rack.removeTiles(turn.replacements);
      this.bag2rack(turn.placements, player.rack);
      this.letterBag.returnTiles(racked);
      player.passes--;
      this.whosTurnKey = player.key;
      // TODO: notify
    },

    /**
     * Undo a play. Resets the game state as if it had never happened.
     * @function
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unplay(turn) {
      this._debug("unplay");
      this.state = State.PLAYING;
      const player = this.getPlayer(turn.playerKey);
      const racked = player.rack.removeTiles(turn.replacements);
      this.board2rack(turn.placements, player.rack);
      this.letterBag.returnTiles(racked);
			player.score -= turn.score;
			player.passes = turn.prepasses || 0;
      this.whosTurnKey = player.key;

      // TODO: notify
    },

    /**
     * Undo a game over confirmation.
     * Resets the game state as if it had never happened.
     * @function
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unconfirmGameOver(turn) {
      this._debug("\tend state", turn);
      // Re-adjustscores from the delta
      let pointsGainedFromRacks = 0;
      for (const key of Object.keys(turn.score)) {
        const delta = turn.score[key];
        const player = this.getPlayer(key);
        Platform.assert(player, key);
        player.score -= (delta.time || 0) + (delta.tiles || 0);
        pointsGainedFromRacks += Math.abs(delta.tiles);
      }
			const winner = this.getWinner();
      winner.score -= pointsGainedFromRacks;
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
    untakeBack(turn) {
      this.state = State.PLAYING;
      const player = this.getPlayer(turn.playerKey);
      this.rack2board(turn.placements, player.rack);
      this.bag2rack(turn.replacements, player.rack);
      player.score -= turn.score;
      this.whosTurnKey = this.nextPlayer(player).key;
      this._debug(`\tplayer now ${this.whosTurnKey}`,turn);
      // TODO: Notify
    },

    /**
     * Undo a pass. Resets the game stat as if it had never happened.
     * @function
     * @memberof Undo
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unpass(turn) {
      this._debug("unpass ", turn.type);
      this.state = State.PLAYING;
      const player = this.getPlayer(turn.playerKey);
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
    unchallenge(turn) {
      const player = this.getPlayer(turn.challengerKey);
      this._debug("\t", player.toString(), "regained", turn.score);
      player.score -= turn.score;
      // TODO: Notify
    },

    /**
     * Undo the most recent turn. Resets the play state as if the turn had never
     * happened. Sends a Notify.UNDONE to all listeners, passing the Turn
     * that was unplayed.
     * @function
     * @memberof Undo
     * @param {boolean?} nosave disables saving after undo.
     * @return {Promise} promise resolving to undefined
     */
    undo(nosave) {
      const turn = this.turns.pop();
      Platform.assert(turn);
      this._debug(`un-${turn.type}`);
      switch (turn.type) {
		  case Turns.SWAPPED:
        this.unswap(turn); break;
		  case Turns.PASSED:
		  case Turns.TIMED_OUT:
        this.unpass(turn); break;
		  case Turns.PLAYED:
        this.unplay(turn); break;
		  case Turns.TOOK_BACK:
		  case Turns.CHALLENGE_WON:
        this.untakeBack(turn); break;
		  case Turns.GAME_ENDED:
        this.unconfirmGameOver(turn); break;
		  case Turns.CHALLENGE_LOST:
        this.unchallenge(turn); break;
      default:
        Platform.fail(`Unkown turn type '${turn.type}'`);
      }
      if (nosave)
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
      switch (turn.type) {
		  case Turns.SWAPPED:
        // Remove and return the tiles to the the unshaken bag
        // to ensure replayability
        this.letterBag.predictable = true;
        this.letterBag.removeTiles(turn.replacements);
        this.letterBag.returnTiles(turn.replacements);
        return this.swap(player, turn.placements)
        .then(() => delete this.letterBag.predictable);
		  case Turns.PLAYED:
        this.letterBag.predictable = true;
        this.letterBag.removeTiles(turn.replacements);
        this.letterBag.returnTiles(turn.replacements);
        return this.play(player, turn)
        .then(() => delete this.letterBag.predictable);
		  case Turns.PASSED:
		  case Turns.TIMED_OUT:
        return this.pass(player, turn.type);
		  case Turns.TOOK_BACK:
        return this.takeBack(player, turn.type);
		  case Turns.CHALLENGE_WON:
		  case Turns.CHALLENGE_LOST:
        return this.challenge(this.getPlayerWithKey(turn.challengerKey));
		  case Turns.GAME_ENDED:
        return this.confirmGameOver(turn.endState);
      }
      /* istanbul ignore next */
      return Platform.assert(false, `Unrecognised turn type ${turn.type}`);
    }
  };
});
