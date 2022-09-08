/*Copyright (C) 2021-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, browser */

define([
  "platform", "common/Utils", "game/Player", "common/Types"
], (
  Platform, Utils, Player, Types
) => {

  const Turns = Types.Turns;
  const Penalty = Types.Penalty;
  const State = Types.State;

  /**
   * Browser-side base class for {@linkcode Game}
   */
  class BrowserGame {

    /**
     * Headline is the text shown in the game table and the head
     * of the game dialog.
     * @param {boolean} inTable true if this is being prepared for the
     * table, false for the dialog.
     */
    $headline(inTable) {
      const headline = [ this.edition ];

      if (inTable) {
        if (this.getPlayers().length > 0)
          headline.push($.i18n(
            "players",
            Utils.andList(this.getPlayers().map(p => p.name))));
        headline.push($.i18n(
          "created",
          new Date(this.creationTimestamp).toDateString()));
      }

      const isActive = !this.hasEnded();

      const $h = $(document.createElement("span"))
            .addClass("headline")
            .attr("name", this.key)
            .text(headline.join(", "));

      if (!isActive)
        $h.append(
          $(document.createElement("span"))
          .addClass("game-state")
          .text($.i18n(this.state)))
        .append(
          $(document.createElement("span"))
          .addClass("who-won")
          .text($.i18n("who-won", this.getWinner().name)));
      return $h;
    }

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
      const $tab = $(document.createElement("table")).addClass("player-table");
      this.players.forEach(
        p => $tab.append(p.$tableRow(thisPlayer)));
      return $tab;
    }

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
          player = Player.fromSerialisable(watcher);
          this.addPlayer(player, true);
          player._debug = this._debug;
        }
        player.online(watcher._isConnected || watcher.isRobot);
        newOrder.push(player);
        if (watcher.isNextToGo)
          this.whosTurnKey = player.key;
      }
      this.players = newOrder;
    }

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

      const $description = $(document.createElement("div")).addClass("turn-description");

      // Who's turn was it?
      const $player = $(document.createElement("div")).addClass("turn-player");
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
          who = $.i18n("player-s", challenger.name);
      } else {
        what = $.i18n("turn");
        if (wasMe)
          who = $.i18n("Your");
        else
          who = $.i18n("player-s", player.name);
      }
      $player.append(
        $.i18n("player-name", who, what));

      $description.append($player);

      // What did they do?
      const $action = $(document.createElement("div")).addClass("turn-detail");
      $description.append($action);

      let playerPossessive;
      let playerIndicative;
      if (wasMe) {
        playerPossessive = $.i18n("your");
        playerIndicative = $.i18n("You");
      } else {
        playerPossessive = $.i18n("player-s", player.name);
        playerIndicative = player.name;
      }

      let challengerPossessive;
      let challengerIndicative;
      if (challenger === uiPlayer) {
        challengerPossessive = $.i18n("Your");
        challengerIndicative = $.i18n("You");
      } else if (challenger) {
        challengerPossessive = $.i18n("player-s", challenger.name);
        challengerIndicative = challenger.name;
      }

      switch (turn.type) {

      case Turns.PLAYED:
        $action.append(turn.$score(false));
        // Check if the play emptied the rack of the playing player
        if (isLastTurn
            && turn.replacements.length === 0
            && player.rack.isEmpty()
            && !this.hasEnded()) {

          const $narrative = $(document.createElement("div")).addClass("turn-narrative");
          if (wasMe)
            $narrative.append($.i18n(
              "log-no-tiles"));
          else
            $narrative.append($.i18n(
              "log-no-more-tiles",
              playerIndicative));
          $description.append($narrative);
        }
        break;

      case Turns.SWAPPED:
        $action.append($.i18n(
          "swapped",
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
          "log-challenge-won",
          challengerIndicative, playerPossessive)
        + " "
        + $.i18n(
          "lost-to-challenge",
          playerIndicative, turn.score));
        break;

      case Turns.CHALLENGE_LOST:
        $action.append($.i18n(
          "log-chall-fail",
          challengerPossessive, playerPossessive));
        switch (this.challengePenalty) {
        case Penalty.PER_WORD:
        case Penalty.PER_TURN:
          $action.append(" " + $.i18n(
            "lost-to-challenge",
            challengerIndicative, -turn.score));
          break;
        case Penalty.MISS:
          $action.append(
            " " + $.i18n("miss-turn", challengerIndicative));
          break;
        }
        break;

      default:
        /* istanbul ignore next */
        Platform.fail(`Unknown move type ${turn.type}`);
      }

      return $description;
    }

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

      const $description = $(document.createElement("div")).addClass("turn-description");

      const $state = $(document.createElement("div")).addClass("game-state")
      .append($.i18n(turn.endState || State.GAME_OVER));

      $description.append($state);

      const $narrative = $(document.createElement("div"))
            .addClass("game-end-adjustments");
      this.getPlayers().forEach(player => {
        const wasMe = player === uiPlayer;
        const name = wasMe ? $.i18n("You") : player.name;

        // Adjustments made to scores due to remaining letters on racks and
        // time penalties
        // tiles: {number} if positive, points gained from the tiles of other
        // players. If negative, points lost to remaining tiles on rack.
        // tilesRemaining: {string} if tiles < 0, the letters that caused it
        // time: <number} points lost due to time penalties
        const adjust = turn.score[player.key];

        if (player.score === winningScore)
          winners.push(name);

        let rackAdjust;
        if (adjust.tiles > 0) {
          rackAdjust = $.i18n(
            "gained-from-racks", name, adjust.tiles);
        } else if (adjust.tiles < 0) {
          // Lost sum of unplayed letters
          rackAdjust = $.i18n(
            "lost-from-rack", name, -adjust.tiles, adjust.tilesRemaining);
        }

        if (rackAdjust)
          $narrative.append(
            $(document.createElement("div"))
            .addClass("rack-adjust").text(rackAdjust));

        const timePenalty = adjust.time;
        if (typeof timePenalty === "number" && timePenalty !== 0) {
          const $timeAdjust = $(document.createElement("div"))
                .addClass("time-adjust");
          $timeAdjust.text($.i18n(
            "lost-to-clock", name, -timePenalty));
          $narrative.append($timeAdjust);
        }

        player.$refreshScore();
      });

      const $whoWon = $(document.createElement("div")).addClass("game-winner");
      let who;
      let nWinners = 0;
      if (this.getWinner() === uiPlayer && winners.length === 1)
        who = $.i18n("You");
      else {
        who = Utils.andList(winners);
        nWinners = winners.length;
      }
      $whoWon.append($.i18n("log-winner",
                            who, nWinners));

      $description.append($whoWon);
      $description.append($narrative);

      return $description;
    }
  }

  return BrowserGame;
});
