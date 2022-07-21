/*Copyright (C) 2021-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define([
  "platform", "game/Player", "game/Undo"
], (
  Platform, Player, Undo
) => {

  /**
   * Provides browser-specific functionality for {@linkcode Game}
   * @mixin BrowserGame
   */
  const BrowserGame = {

    /**
     * Create the UI for the player table
     * @function
     * @memberof BrowserGame
     * @param {Player} thisPlayer the player for whom the DOM is
     * being generated
     * @return {jQuery} jQuery object representing the player table
     */
    $ui(thisPlayer) {
      const $tab = $("<table></table>").addClass("player-table");
      this.players.forEach(
        p => $tab.append(p.$ui(thisPlayer)));
      return $tab;
    },

    /**
     * Given a list of Player.simple, update the players list
     * to reflect the members and ordering of that list.
     * @function
     * @memberof BrowserGame
     * @param {object[]} observers list of observers (simple objects)
     */
    updatePlayerList(observers) {
      for (let player of this.players)
        player.online(false);
      const newOrder = [];
      for (let watcher of observers) {
        let player = this.getPlayerWithKey(watcher.key);
        if (!player) {
          // New player in game
          player = Player.fromSimple(watcher);
          this.addPlayer(player, true);
          player._debug = this._debug;
        }
        player.online(watcher.isConnected || watcher.isRobot);
        newOrder.push(player);
        if (watcher.isNextToGo)
          this.whosTurnKey = player.key;
      }
      this.players = newOrder;
    }
  };

  Object.assign(BrowserGame, Undo);

  return BrowserGame;
});
