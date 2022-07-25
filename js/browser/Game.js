/*Copyright (C) 2021-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define([
  "platform", "common/Utils", "game/Player", "game/Types"
], (
  Platform, Utils, Player, Types
) => {

  const Turns = Types.Turns;
  const Penalty = Types.Penalty;
  const State = Types.State;

  /**
   * Browser-side mixin for {@linkcode Game}
   * @mixin BrowserGame
   */
  const BrowserGame = {

    /**
     * Create the UI for the player table
     * @function
     * @instance
     * @memberof BrowserGame
     * @param {Player} thisPlayer the player for whom the DOM is
     * being generated
     * @return {jQuery} jQuery object representing the player table
     */
    $playerTable(thisPlayer) {
      const $tab = $("<table></table>").addClass("player-table");
      this.players.forEach(
        p => $tab.append(p.$tableRow(thisPlayer)));
      return $tab;
    },

    /**
     * Given a list of Player.simple, update the players list
     * to reflect the members and ordering of that list.
     * @function
     * @instance
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
        player.online(watcher._isConnected || watcher.isRobot);
        newOrder.push(player);
        if (watcher.isNextToGo)
          this.whosTurnKey = player.key;
      }
      this.players = newOrder;
    },

    /**
     * Generate a description of the given turn
     * @param {Turn} turn the turn to describe
     * @param {Player} uiPlayer the player who's UI the description is
     * being generated for
     * @param {boolean} isLastTurn set true if this is the most
     * recent turn
     * @return {jQuery} a jquery div
     */
    describeTurn(turn, uiPlayer, isLastTurn) {
      if (turn.type === Turns.GAME_ENDED)
        return this.describeGameOver(turn, uiPlayer);

      const $description = $("<div></div>").addClass("turn-description");

      // Who's turn was it?
      const $player = $("<div></div>").addClass("turn-player");
      let player = this.getPlayerWithKey(turn.playerKey);
      if (!player)
        player = new Player({name: "Unknown player"});
      const wasMe = (player === uiPlayer);
      const challenger = (typeof turn.challengerKey === "string")
            ? this.getPlayerWithKey(turn.challengerKey) : undefined;

      let what, who;
      if (turn.type === Turns.CHALLENGE_LOST) {
        what = $.i18n("challenge");
        if (challenger === uiPlayer)
          who = $.i18n("Your");
        else
          who = $.i18n("$1's", challenger.name);
      } else {
        what = $.i18n("turn");
        if (wasMe)
          who = $.i18n("Your");
        else
          who = $.i18n("$1's", player.name);
      }
      $player.append(
        $.i18n("<span class='player-name'>$1</span> $2", who, what));

      $description.append($player);

      // What did they do?
      const $action = $("<div></div>").addClass("turn-detail");
      $description.append($action);

      let playerPossessive;
      let playerIndicative;
      if (wasMe) {
        playerPossessive = $.i18n("your");
        playerIndicative = $.i18n("You");
      } else {
        playerPossessive = $.i18n("$1's", player.name);
        playerIndicative = player.name;
      }

      let challengerPossessive;
      let challengerIndicative;
      if (challenger === uiPlayer) {
        challengerPossessive = $.i18n("Your");
        challengerIndicative = $.i18n("You");
      } else if (challenger) {
        challengerPossessive = $.i18n("$1's", challenger.name);
        challengerIndicative = challenger.name;
      }

      switch (turn.type) {

      case Turns.PLAYED:
        $action.append(turn.$score(false));
        // Check if the play emptied the rack of the playing player
        if (isLastTurn
            && turn.replacements.length === 0
            && !this.hasEnded()) {

          const $narrative = $("<div></div>").addClass("turn-narrative");
          if (wasMe)
            $narrative.append($.i18n(
              "You have no more tiles, game will be over if your play isn't challenged"));
          else
            $narrative.append($.i18n(
              "$1 has no more tiles, game will be over unless you challenge",
              playerIndicative));
          $description.append($narrative);
        }
        break;

      case Turns.SWAPPED:
        $action.append($.i18n(
          "Swapped $1 tile{{PLURAL:$1||s}}",
          turn.replacements.length));
        break;

      case Turns.TIMED_OUT:
        $action.append($.i18n("Timed out"));
        break;

      case Turns.PASSED:
        $action.append($.i18n("Passed"));
        break;

      case Turns.TOOK_BACK:
        $action.append($.i18n("Took back their turn"));
        break;

      case Turns.CHALLENGE_WON:
        $action.append($.i18n(
          "$1 successfully challenged $2 play.",
          challengerIndicative, playerPossessive)
        + " "
        + $.i18n(
          "$1 lost $2 point{{PLURAL:$2||s}}",
          playerIndicative, turn.score));
        break;

      case Turns.CHALLENGE_LOST:
        $action.append($.i18n(
          "$1 challenge of $2 play failed.",
          challengerPossessive, playerPossessive));
        switch (this.challengePenalty) {
        case Penalty.PER_WORD:
        case Penalty.PER_TURN:
          $action.append(" " + $.i18n(
            "$1 lost $2 point{{PLURAL:$2||s}}",
            challengerIndicative, -turn.score));
          break;
        case Penalty.MISS:
          $action.append(
            " " + $.i18n("$1 will miss a turn", challengerIndicative));
          break;
        }
        break;

      default:
        /* istanbul ignore next */
        Platform.fail(`Unknown move type ${turn.type}`);
      }

      return $description;
    },

    /**
     * Append a formatted 'end of game' message to the log
     * @param {Turn} turn a Turns.GAME_ENDED Turn
     * @param {Player} uiPlayer the player who's UI the description is
     * being generated for
     * @return {jQuery} a jquery div
     * @private
     */
    describeGameOver(turn, uiPlayer) {
      const adjustments = [];
      const winningScore = this.winningScore();
      const winners = [];

      const $description = $("<div></div>").addClass("turn-description");

      // When the game ends, each player's score is reduced by
      // the sum of their unplayed letters. If a player has used
      // all of his or her letters, the sum of the other players'
      // unplayed letters is added to that player's score. The
      // score adjustments are already done, on the server side,
      // we just need to present the results.
      const unplayed = this.getPlayers().reduce(
        (sum, player) => sum + player.rack.score(), 0);

      const $state = $("<div></div>").addClass("game-state")
      .append($.i18n(turn.endState || State.GAME_OVER));

      $description.append($state);

      const $narrative = $("<div></div>").addClass("game-outcome");
      this.getPlayers().forEach(player => {
        const wasMe = player === uiPlayer;
        const name = wasMe ? $.i18n("You") : player.name;
        const $rackAdjust = $("<div></div>").addClass("rack-adjust");

        if (player.score === winningScore)
          winners.push(name);

        if (player.rack.isEmpty()) {
          if (unplayed > 0) {
            $rackAdjust.text($.i18n(
              "$1 gained $2 point{{PLURAL:$2||s}} from the racks of other players",
              name, unplayed));
          }
        } else if (player.rack.score() > 0) {
          // Lost sum of unplayed letters
          $rackAdjust.text($.i18n(
            "$1 lost $2 point{{PLURAL:$2||s}} for a rack containing '$3'",
            name, player.rack.score(),
            player.rack.lettersLeft().join(",")));
        }
        player.$refresh();
        $narrative.append($rackAdjust);

        const timePenalty = turn.score[player.key].time;
        if (typeof timePenalty === "number" && timePenalty !== 0) {
          const $timeAdjust = $("<div></div>").addClass("time-adjust");
          $timeAdjust.text($.i18n(
            "$1 lost $2 point{{PLURAL:$2||s}} to the clock",
            name, Math.abs(timePenalty)));
          $narrative.append($timeAdjust);
        }
      });

      const $whoWon = $("<div></div>").addClass("game-winner");
      let who;
      let nWinners = 0;
      if (this.getWinner() === uiPlayer && winners.length === 1)
        who = $.i18n("You");
      else {
        who = Utils.andList(winners);
        nWinners = winners.length;
      }
      $whoWon.append($.i18n("$1 {{PLURAL:$2|has|have}} won",
                            who, nWinners));

      $description.append($whoWon);
      $description.append($narrative);

      return $description;
    }
  };

  return BrowserGame;
});
