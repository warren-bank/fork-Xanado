/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define("game/Undo", [
	"platform", "common/Utils",
	"game/Types", "game/Game"
], (
	Platform, Utils,
  Types
) => {

  const Turns  = Types.Turns;
  const State  = Types.State;
  const Notify = Types.Notify;

  /**
   * Provides Undo functionality for Game
   */
  class Undo {

    /**
     * @param {Game} game the game we are undoing turns in
     */
    constructor(game) {
      this.game = game;
      this._debug = game._debug;
    }

    /*
     * Take tiles out of the player's rack
     * @param {Tile[]} tiles list of tiles
     * @param {Player} current player
     */
    unrack(tiles, player) {
      const racked = [];
			for (const tile of tiles) {
        //this._debug("\tunrack", tile.toString());
	      const removed = player.rack.removeTile(tile);
        Platform.assert(removed, `${tile.toString()} missing from rack`);
        racked.push(removed);
      }
      return racked;
    }

    /*
     * Take tiles out of the letter bag
     * @param {Tile[]} tiles list of tiles
     * @return {Tile[]} list of tiles removed from the bag 
     */
    unbag(tiles) {
      const unbagged = [];
			for (const tile of tiles) {
        //this._debug("\tbag2rack", tile.toString());
	      unbagged.push(this.game.letterBag.removeTile(tile));
      }
      return unbagged;
    }

    /*
     * Take tiles out of the letter bag and put them back on the rack
     * @param {Tile[]} tiles list of tiles
     * @param {Player} current player
     */
    bag2rack(tiles, player) {
			for (const tile of tiles) {
        //this._debug("\tbag2rack", tile.toString());
	      const removed = this.game.letterBag.removeTile(tile);
        Platform.assert(removed, `${tile.toString()} missing from bag`);
        player.rack.addTile(removed);
      }
    }

    /*
     * Put tiles back in the bag
     * @param {Tile[]} tiles list of tiles
     * @param {Player} current player
     */
    rebag(tiles) {
      for (const tile of tiles) {
        //this._debug("\trebag", tile.toString());
        this.game.letterBag.returnTile(tile);
      }
    }

    /*
     * Put tiles back on the rack
     * @param {Tile[]} tiles list of tiles
     * @param {Player} current player
     */
    rerack(tiles, player) {
      for (const tile of tiles) {
        //this._debug("\trerack", tile.toString());
        player.rack.addTile(new Tile(tile));
      }
    }

    /**
     * Move tiles from the board back to the rack
     * @param {Tile[]} tiles list of tiles
     * @param {Player} current player
     */
    board2rack(tiles, player) {
      for (const pl of tiles) {
        const sq = this.game.board.at(pl.col, pl.row);
        //this._debug("\tboard2rack", sq.tile.toString());
        const t = sq.unplaceTile();
        player.rack.addTile(t);
      }
    }

    /**
     * Move tiles from the rack to the board
     * @param {Tile[]} tiles list of tiles
     * @param {Player} current player
     */
    rack2board(tiles, player) {
      // Move tiles from the rack back onto the board
      for (const place of tiles) {
				const tile = player.rack.removeTile(place);
        Platform.assert(tile);
				const square = this.game.board.at(place.col, place.row);
        Platform.assert(!square.tile);
				square.placeTile(tile, true);
        //this._debug(`\tplace ${tile.toString()}`);
      }
    }

    /**
     * Undo a swap. Resets the game state as if it had never happened.
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unswap(turn) {
      this.game.state = State.PLAYING;
      const player = this.game.getPlayer(turn.playerKey);
      const racked = this.unrack(turn.replacements, player);
      this.bag2rack(turn.placements, player);
      this.rebag(racked);
      player.passes--;
      this.game.whosTurnKey = player.key;
      // TODO: notify
    }

    /**
     * Undo a play. Resets the game state as if it had never happened.
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unplay(turn) {
      this._debug("unplay");
      this.game.state = State.PLAYING;
      const player = this.game.getPlayer(turn.playerKey);
      const racked = this.unrack(turn.replacements, player);
      this.board2rack(turn.placements, player);
      this.rebag(racked);
			player.score -= turn.score;
			player.passes = turn.prepasses || 0;
      this.game.whosTurnKey = player.key;

      // TODO: notify
    }

    /**
     * Undo a game over confirmation.
     * Resets the game state as if it had never happened.
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unconfirmGameOver(turn) {
      this._debug("\tend state", turn);
      // Re-adjustscores from the delta
      let pointsGainedFromRacks = 0;
      for (const key of Object.keys(turn.score)) {
        const delta = turn.score[key];
        const player = this.game.getPlayer(key);
        Platform.assert(player, key);
        player.score -= (delta.time || 0) + (delta.tiles || 0);
        pointsGainedFromRacks += Math.abs(delta.tiles);
      }
			const winner = this.game.players.find(player => player.rack.isEmpty());
      winner.score -= pointsGainedFromRacks;
      this.game.state = State.PLAYING;
      // TODO: Notify
      // TODO: reset the clock
    }

    /**
     * Undo a TOOK_BACK or CHALLENGE_WON.
     * Resets the game state as if it had never happened.
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    untakeBack(turn) {
      this.game.state = State.PLAYING;
      const player = this.game.getPlayer(turn.playerKey);
      this.rack2board(turn.placements, player);
      this.bag2rack(turn.replacements, player);
      player.score -= turn.score;
      this.game.whosTurnKey = this.game.nextPlayer(player).key;
      this._debug(`\tplayer now ${this.game.whosTurnKey}`,turn);
      // TODO: Notify
    }

    /**
     * Undo a pass. Resets the game stat as if it had never happened.
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unpass(turn) {
      this._debug("unpass ", turn.type);
      this.game.state = State.PLAYING;
      const player = this.game.getPlayer(turn.playerKey);
      player.passes--;
      this.game.whosTurnKey = player.key;
      // TODO: Notify
    }

    /**
     * Unplay a LOST challenge (won challenges are handled in untakeBack).
     * Resets the game state as if it had never happened.
     * @param {Turn} turn the Turn to unplay
     * @private
     */
    unchallenge(turn) {
      const player = this.game.getPlayer(turn.challengerKey);
      this._debug("\t", player.toString(), "regained", turn.score);
      player.score -= turn.score;
      // TODO: Notify
    }

    /**
     * Undo the most recent turn in the game
     */
    undo() {
      const turn = this.game.turns.pop();
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
    }
  }

  return Undo;
});
