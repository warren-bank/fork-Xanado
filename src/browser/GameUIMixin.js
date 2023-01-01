/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

/* global Platform */

import "jquery/dist/jquery.js";
import "jquery-ui/dist/jquery-ui.js";

import "./icon_button.js";

import { stringify } from "../common/Utils.js";
import { loadDictionary } from "../game/loadDictionary.js";
import { Game } from "../game/Game.js";
import { UI } from "./UI.js";
import { UIEvents } from "./UIEvents.js";

let BEEP;

/* istanbul ignore next*/
/**
 * Make a quiet noise.
 * @private
 */
function beep() {
  try {
    if (!BEEP)
      BEEP = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
    BEEP.play();
  } catch (e) {
    console.error("Beep");
  }
}

/**
 * Mixin with functionality for the user interface to a game in a browser.
 * This is common functionality between the client UI (client/ClientGameUI.js,
 * used with a server) and the standalone UI (standalone/StandaloneGameUI.js).
 * @mixin browser/GameUIMixin
 */
const GameUIMixin = superclass => class extends superclass {

  /**
   * The game being played.
   * @memberof browser/GameUIMixin
   * @instance
   * @member {Game}
   */
  game = undefined;

  /**
   * The current player.
   * @memberof browser/GameUIMixin
   * @instance
   * @member {Player}
   */
  player = undefined;

  /**
   * Currently selected Square (if any)
   * @memberof browser/GameUIMixin
   * @instance
   * @member {Square?}
   * @private
   */
  selectedSquare = undefined;

  /**
   * Board lock status
   * @memberof browser/GameUIMixin
   * @instance
   * @member {boolean}
   * @private
   */
  boardLocked = false;

  /**
   * Undo stack. Head of the stack is the most recent undo.
   * The undo stack is cleared when a normal play (swap, place,
   * challenge etc) is executed.
   *
   */
  undoStack = [];

  /**
   * Send a game command to the game engine. Game commands are listed in
   * the {@linkcode Command} type.
   * Must be implemented by a sub-mixin or final class.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {string} command command name
   * @param {object} args arguments for the request body
   */
  sendCommand(command, args) {
    assert.fail(`GameUIMixin.sendCommand ${command} ${args}`);
  }

  /**
   * Get the current value for a setting. If a user is signed in, the
   * value will be taken from their session (and will default if it
   * is not defined).
   * Must be implemented by a sub-mixin or final class.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {string} key setting to retrieve
   * @return {string|number|boolean} setting value
   */
  getSetting(key) {
    assert.fail(`GameUIMixin.getSetting ${key}`);
  }

  /**
   * Get a structure describing the game configuration defaults.
   * Must be implemented by a sub-mixin or final class.
   * @memberof browser/GameUIMixin
   * @instance
   */
  getGameDefaults() {
    assert.fail("GameUIMixin.getGameDefaults");
  }

  /**
   * Get the named dictionary.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {string?} name dictionary name
   * @return {Promise} resolving to a {@linkcode Dictionary}
   */
  getDictionary(name) {
    return loadDictionary(name);
  }

  /**
   * Get the named edition.
   * Must be implemented by a sub-mixin or final class.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {string?} ed name of edition to get
   * @return {Promise} promise that resolves to the {@linkcode Edition} or
   * a list of edition names if ed is null.
   */
  getEdition(ed) {
    assert.fail(`GameUIMixin.getEdition ${ed}`);
  }

  /**
   * Append to the log pane. Messages are wrapped in a div, which
   * may have the optional css class.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {boolean} interactive false if we are replaying messages into
   * the log, true if this is an interactive response to a player action.
   * @param {(jQuery|string)} mess thing to add
   * @param {string?} optional css class name
   * @return {jQuery} the div created
   * @private
   */
  $log(interactive, mess, css) {
    const $div = $(document.createElement("div"))
          .addClass("message");
    if (css)
      $div.addClass(css);
    $div.append(mess);
    const $lm = $("#logBlock > .messages");
    $lm.append($div);
    if (interactive)
      $lm.animate({
        scrollTop: $("#logBlock > .messages").prop("scrollHeight")
      }, 300);
    return $div;
  }

  /**
   * True if the key is this current player key
   * @memberof browser/GameUIMixin
   * @instance
   * @param {string} key the player key to check
   * @return {boolean} true if we are that player
   */
  isThisPlayer(key) {
    return this.player && this.player.key === key;
  }

  /**
   * Incoming notification to update list of active connections.
   * @memberof browser/GameUIMixin
   * @instance
   */
  handle_CONNECTIONS(observers) {
    console.debug("f<b connections", stringify(observers));
    if (!(this.game.allowUndo || this.game.syncRacks)) {
      // Make racks of other players wild to mask their contents
      for (const p of this.game.getPlayers()) {
        if (p !== this.player) {
          console.debug(p.name, "is rack wild");
          p.rack.isWild = true;
        }
      }
      // Make the bag wild, so it serves wild tiles
      this.game.letterBag.isWild = true;
    }

    this.game.updatePlayerList(
      observers.filter(o => !o.isObserver));
    this.updateObservers(observers.filter(o => o.isObserver));
    this.updatePlayerTable();
    let myGo = this.isThisPlayer(this.game.whosTurnKey);
    this.lockBoard(!myGo);
  }

  /**
   * Incoming notification to add a message to the
   * chat pane. Message text that matches an i18n message
   * identifier will be automatically translated with supplied
   * message args.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {object} message message object
   * @param {string} message.sender sender name (or Advisor)
   * @param {string} message.text i18n message identifier or plain text
   * @param {string} message.classes additional css classes to apply to
   * message
   * @param {object[]} args i18n arguments
   */
  handle_MESSAGE(message) {
    console.debug("f<b message");
    let args = [ message.text ];
    if (typeof message.args === "string")
      args.push(message.args);
    else if (message.args instanceof Array)
      args = args.concat(message.args);

    const sender = /^chat-/.test(message.sender)
          ? $.i18n(message.sender) : message.sender;
    const $pn = $(document.createElement("span")).addClass("chat-sender");
    $pn.text(sender);

    const $mess = $(document.createElement("div")).addClass("chat-message");
    if (message.classes)
      $mess.addClass(message.classes);
    $mess.append($pn).append(": ");

    const $msg =  $(document.createElement("span")).addClass("chat-text");
    $msg.text($.i18n.apply(null, args));
    $mess.append($msg);

    this.$log(true, $mess);

    // Special handling for _hint_, highlight square
    if (message.sender === "Advisor"
        && args[0] === /*i18n*/"_hint_") {
      let row = args[2] - 1, col = args[3] - 1;
      $(`#Board_${col}x${row}`).addClass("hint-placement");
    }
  }

  /**
   * Incoming notification of a tick from the backend. Does nothing
   * in an untimed game.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {object} params Parameters
   * @param {string} gameKey game key
   * @param {string} playerKey player key
   * @param {string} clock seconds left for this player to play
   */
  handle_TICK(params) {
    // if (this.debug) this.debug("f<b tick");
    if (params.gameKey !== this.game.key)
      console.error(`key mismatch ${this.game.key}`);
    $(".player-clock")
    .hide();

    const ticked = this.game.getPlayerWithKey(params.playerKey);
    if (!ticked) {
      console.error("No such player", params.playerKey);
      return;
    }
    let remains = params.clock;
    ticked.clock = remains;

    const clocks = UI.formatTimeInterval(remains);

    let extraClass = "tick-alert-none";
    const allowedSecs = this.game.timeAllowed * 60;
    if (this.game.timerType === Game.Timer.TURN) {
      if (this.player && ticked.key === this.player.key
          && remains <= 10
          && this.getSetting("warnings"))
        this.playAudio("tick");

      if (remains < allowedSecs / 6)
        extraClass = "tick-alert-high";
      else if (remains < allowedSecs / 3)
        extraClass = "tick-alert-medium";
      else if (remains < allowedSecs / 2)
        extraClass = "tick-alert-low";
    }
    else if (this.game.timerType === Game.Timer.GAME) {
      if (remains < allowedSecs / 10)
        extraClass = "tick-alert-high";
      else if (remains < allowedSecs / 5)
        extraClass = "tick-alert-medium";
    }

    $(`#player${ticked.key} .player-clock`)
    .show()
    .removeClass("tick-alert-low tick-alert-medium tick-alert-high")
    .addClass(extraClass)
    .text(clocks);
  }

  /**
   * Incoming Turn object received from the backend. `Game.Notify.TURN`
   * is sent by the backend when an action by any player has
   * modified the game state.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {Turn} turn a Turn object
   */
  handle_TURN(turn) {
    console.debug("f<b turn ", turn);

    this.game.pushTurn(turn);

    $("#undoButton").toggle(this.game.allowUndo === true);

    this.removeMoveActionButtons();
    const player = this.game.getPlayerWithKey(turn.playerKey);
    const challenger = (typeof turn.challengerKey === "string")
          ? this.game.getPlayerWithKey(turn.challengerKey) : undefined;

    if (turn.type === Game.Turns.CHALLENGE_LOST) {
      challenger.score += turn.score;
      challenger.$refreshScore();
    } else {
      switch (typeof turn.score) {
      case "number":
        player.score += turn.score;
        player.$refreshScore();
        break;
      case "object":
        for (const delta of turn.score) {
          const p = this.game.getPlayerWithKey(delta.key);
          p.score += (delta.tiles || 0) + (delta.time || 0);
          p.$refreshScore();
        }
      }
    }

    // Unhighlight last placed tiles
    $(".last-placement").removeClass("last-placement");

    this.$log(true, this.game.describeTurn(turn, this.player, true));

    // Was the play initiated by, or primarily affecting, us
    const wasUs = (player === this.player);

    switch (turn.type) {
    case Game.Turns.CHALLENGE_WON:
    case Game.Turns.TOOK_BACK:
      if (wasUs)
        this.takeBackTiles();

      // Move new tiles out of challenged player's rack
      // into the bag
      if (turn.replacements)
        this.game.rackToBag(turn.replacements, player);

      // Take back the placements from the board into the
      // challenged player's rack
      if (turn.placements)
        this.game.boardToRack(turn.placements, player);

      // Was it us?
      if (wasUs) {
        if (turn.type === Game.Turns.CHALLENGE_WON) {
          if (this.getSetting("warnings"))
            this.playAudio("oops");
          this.notify(
            $.i18n("nfy-chall-wonH"),
            $.i18n("nfy-chall-wonB",
                   this.game.getPlayerWithKey(turn.playerKey).name,
                   -turn.score));
        }
      }

      if (turn.type == Game.Turns.TOOK_BACK) {
        this.notify(
          $.i18n("nfy-took-backH"),
          $.i18n("nfy-took-backB",
                 this.game.getPlayerWithKey(turn.playerKey).name));
      }
      break;

    case Game.Turns.CHALLENGE_LOST:
      if (this.getSetting("warnings"))
        this.playAudio("oops");
      if (challenger === this.player) {
        // Our challenge failed
        this.notify($.i18n("nfy-you-failedH"),
                    $.i18n("nfy-you-failedB"));
      } else {
        this.notify($.i18n("nfy-they-failedH"),
                    $.i18n("nfy-they-failedB", player.name));
      }

      break;

    case Game.Turns.PLAYED:
      if (wasUs)
        this.takeBackTiles();
      // Take the placed tiles out of the player's rack and
      // lock them onto the board.
      this.game.rackToBoard(
        turn.placements, player,
        tile => // Highlight the tile as "just placed"
        tile._$tile.addClass("last-placement"));

      // Remove the new tiles from our copy of the bag and put them
      // on the rack.
      if (turn.replacements)
        this.game.bagToRack(turn.replacements, player);
      break;

    case Game.Turns.SWAPPED:
      if (wasUs)
        this.takeBackTiles();
      // If it was our swap, then the rack was cleared when the command
      // was sent. We have to put the swapped tiles (turn.placements)
      // back in the bag, draw the turn.replacements, and put them on
      // the rack.
      this.game.rackToBag(turn.placements, player);
      this.game.bagToRack(turn.replacements, player);

      break;

    case Game.Turns.GAME_ENDED:
      // End of game has been accepted
      if (wasUs)
        this.takeBackTiles();
      this.game.state = Game.State.GAME_OVER;
      this.setAction("action_anotherGame", $.i18n("Another game?"));
      this.enableTurnButton(true);
      this.notify($.i18n("nfy-game-overH"),
                  $.i18n("nfy-game-overB"));

      if (this.player === this.game.getWinner()) {
        if (this.getSetting("cheers"))
          this.playAudio("endCheer");
      } else if (this.getSetting("cheers"))
        this.playAudio("lost");

      return;
    }

    if (this.isThisPlayer(turn.nextToGoKey)) {
      if (this.getSetting("turn_alert"))
        this.playAudio("yourturn");
      this.lockBoard(false);
      this.enableTurnButton(true);
    } else {
      this.lockBoard(true);
      this.enableTurnButton(false);
    }

    if (turn.nextToGoKey && turn.type !== Game.Turns.CHALLENGE_WON) {

      if (turn.type == Game.Turns.PLAYED) {
        if (wasUs) {
          if (this.game.allowTakeBack) {
            this.addTakeBackPreviousButton(turn);
          }
        } else {
          // It wasn't us, we might want to challenge.
          // Not much point in challenging a robot, but
          // ho hum...
          this.addChallengePreviousButton(turn);
        }
      }

      if (this.isThisPlayer(turn.nextToGoKey)
          && turn.type !== Game.Turns.TOOK_BACK) {
        // It's our turn next, and we didn't just take back
        this.notify($.i18n("nfy-your-turnH"),
                    $.i18n("nfy-your-turnB",
                           this.game.getPlayerWithKey(turn.playerKey).name));
      }
      this.game.whosTurnKey = turn.nextToGoKey;
      this.updateWhosTurn();
    }
    this.updateGameStatus();

    // Trigger an event to wake the mechanical turk (if there is one)
    if (this.isThisPlayer(this.game.whosTurnKey))
      Platform.trigger("MY_TURN");
  }

  /**
   * Incoming `nextGame` notification. This tells the UI that a follow-on
   * game is available.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {object} info event info
   * @param {string} info.gameKey key for next game
   */
  handle_NEXT_GAME(info) {
    console.debug("f<b nextGame", info.gameKey);
    this.game.nextGameKey = info.gameKey;
    this.setAction("action_nextGame", $.i18n("Next game"));
  }

  /**
   * Incoming rejection of the last play.
   * In a game where words are checked before the play is accepted,
   * the backend may reject a bad word with a 'reject' message. The
   * message is only sent to the rejected player.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {object} rejection the rejection object
   * @param {string} rejection.playerKey the rejected player
   * @param {string[]} rejection.words the rejected words
   */
  handle_REJECT(rejection) {
    console.debug("f<b reject", rejection);
    // The tiles are only locked down when a corresponding
    // turn is received, so all we need to do is restore the
    // pre-sendCommand state and issues a message.
    this.lockBoard(false);
    this.enableTurnButton(true);
    if (this.getSetting("warnings"))
      this.playAudio("oops");
    this.$log(true, $.i18n(
      "word-rejected",
      rejection.words.length,
      rejection.words.join(", ")), "turn-narrative");

    // Trigger the mechanical turk (if there is one). DO NOT
    // reject autoplays, as that will result in an infinite loop.
    Platform.trigger("MY_TURN");
  }

  /**
   * Incoming notification to pause the game. Opens a modal dialog
   * to block further interaction until the pause is released.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {object} params Parameters
   * @param {string} params.key game key
   * @param {string} params.name name of player who paused/released
   */
  handle_PAUSE(params) {
    console.debug(`f<b pause ${params.name}`);
    if (params.key !== this.game.key)
      console.error(`key mismatch ${this.game.key}`);
    $(".Surface .letter").addClass("hidden");
    $(".Surface .score").addClass("hidden");
    $("#pauseDialog > .banner")
    .text($.i18n("game-paused", params.name));
    $("#pauseDialog")
    .dialog({
      dialogClass: "no-close",
      modal: true,
      buttons: [
        {
          text: $.i18n("label-unpause"),
          click: () => {
            this.sendCommand(Game.Command.UNPAUSE);
            $("#pauseDialog").dialog("close");
          }
        }
      ]});
  }

  /**
   * Incoming notification to release a pause.
   * Close the modal dialog used to report the pause.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {object} params Parameters
   * @param {string} params.key game key
   * @param {string} params.name name of player who paused/released
   */
  handle_UNPAUSE(params) {
    console.debug(`f<b unpause ${params.name}`);
    $(".Surface .letter").removeClass("hidden");
    $(".Surface .score").removeClass("hidden");
    $("#pauseDialog")
    .dialog("close");
  }

  /**
   * Incoming undone notification. This is broadcast to all players
   * when a command has been undone in the backend.
   * @memberof browser/GameUIMixin
   * @instance
   */
  handle_UNDONE(turn) {
    assert(this.game.allowUndo, "Undo disabled");
    this.undoStack.push(turn);
    this.game.popTurn();
    this.game.undo(turn, true);
    const isMyGo = this.isThisPlayer(this.game.whosTurnKey);
    this.updatePlayerTable();
    this.updateWhosTurn();
    this.updateGameStatus();
    $("#redoButton").show();
    $(".last-placement")
    .removeClass("last-placement");
    if (this.game.turns.length === 0)
      $("#undoButton").hide();
    this.lockBoard(!isMyGo);
    this.enableTurnButton(isMyGo);
    this.$log(true, $.i18n(
      "undone",
      turn.type, this.game.getPlayer().name));
    $("#undoButton")
    .toggle(this.game.allowUndo
            && this.game.turns.length > 0);

    // Trigger an event to wake the mechanical turk (if there is one)
    if (isMyGo)
      Platform.trigger("MY_TURN");
  }

  /**
   * Handle a key down event.
   * These are captured in the root of the UI and dispatched here.
   * @memberof browser/GameUIMixin
   * @instance
   */
  keyDown(event) {
    // Only handle events targeted when the board is not
    // locked, and ignore events targeting the chat input.
    // Checks for selection status are performed in
    // individual handler functions.
    if (event.target.id !== "body" || this.boardLocked)
      return;

    switch (event.key) {

    case "ArrowUp": case "Up":
      this.moveTypingCursor(0, -1);
      return;

    case "ArrowDown": case "Down":
      this.moveTypingCursor(0, 1);
      return;

    case "ArrowLeft": case "Left":
      this.moveTypingCursor(-1, 0);
      return;

    case "ArrowRight": case "Right":
      this.moveTypingCursor(1, 0);
      return;

    case "Backspace":
    case "Delete": // Remove placement behind typing cursor
      this.unplaceLastTyped();
      return;

    case "Home": // Take back letters onto the rack
      this.takeBackTiles();
      return;

    case "Enter": case "End": // Commit to move
      this.action_commitMove();
      return;

    case "#": case "@": // Shuffle rack
      this.shuffleRack();
      return;

    case "?": // Pass
      this.action_pass();
      return;

    case "!": // Challenge / take back
      {
        const lastTurn = this.game.lastTurn();
        if (lastTurn && lastTurn.type == Game.Turns.PLAYED) {
          if (this.isThisPlayer(this.game.whosTurnKey))
            // Challenge last move
            this.challenge(lastTurn.playerKey);
          else
            // Still us
            this.takeBackMove();
        }
      }
      return;

    case "*": // to place typing cursor in centre
      // (or first empty square, scanning rows from
      // the top left, if the centre is occupied)
      {
        let sq = this.game.board.at(
          this.game.board.midcol, this.game.board.midrow);
        if (!sq.isEmpty()) {
          this.game.board.forEachSquare(
            boardSquare => {
              if (boardSquare.isEmpty()) {
                sq = boardSquare;
                return true;
              }
              return false;
            });
        }
        this.selectSquare(sq);
      }
      return;

    case " ":
      this.rotateTypingCursor();
      return;

    case ";": // Chat
      $('#chatInput').focus();
      event.preventDefault();
      return;

    default:
      this.manuallyPlaceLetter(event.key.toUpperCase());
    }
  }

  /**
   * Update the list of non-playing observers
   * @memberof browser/GameUIMixin
   * @instance
   * @param {object[]} non-playing observers
   */
  updateObservers(obs) {
    if (obs.length > 0) {
      $("#scoresBlock > .observerCount")
      .show()
      .text($.i18n("observers",
                   obs.length));
    } else
      $("#scoresBlock > .observerCount").hide();
  }

  /**
   * Refresh the player table
   * @memberof browser/GameUIMixin
   * @instance
   */
  updatePlayerTable() {
    const $playerTable = this.game.$playerTable(this.player);
    $("#scoresBlock > .playerList").html($playerTable);
    $(".player-clock").toggle(typeof this.game.timerType !== "undefined");
    this.updateWhosTurn();
  }

  /**
   * Show who's turn it is
   * @memberof browser/GameUIMixin
   * @instance
   */
  updateWhosTurn() {
    $(".whosTurn").removeClass("whosTurn");
    $(`#player${this.game.whosTurnKey}`).addClass("whosTurn");
  }

  /**
   * Update the display of the number of tiles remaining in the
   * letter bag and player's racks. This includes showing the
   * swap rack, if enough tiles remain in the bag.
   * @memberof browser/GameUIMixin
   * @instance
   */
  updateTileCounts() {
    const remains = this.game.letterBag.remainingTileCount();
    if (remains > 0) {
      const mess = $.i18n(
        "tiles-left", remains);
      $("#scoresBlock > .letterbag").text(mess);
      $("#scoresBlock td.remaining-tiles").empty();
    } else {
      $("#scoresBlock > .letterbag")
      .text($.i18n("warn-empty-bag"));
      const countElements = $("#scoresBlock td.remaining-tiles");
      this.game.getPlayers().forEach(
        (player, i) =>
        $(countElements[i]).text(`(${player.rack.squaresUsed()})`));
    }
    $("#swapRack")
    .toggle(remains >= this.game.rackSize);
  }

  /**
   * A game has been read; load it into the UI
   * @memberof browser/GameUIMixin
   * @instance
   * @param {Game} game the Game being played
   * @return {Promise} Promise that resolves to a game
   */
  createUI(game) {
    console.debug("Loading UI for game", game);

    game._debug = console.debug;
    this.game = game;

    // Can swap up to swapCount tiles
    const factory = game.constructor.CLASSES;
    this.swapRack = new factory.Rack(
      factory,
      {
        id: "Swap",
        size: game.swapSize,
        underlay: $.i18n("SWAP")
      });

    this.updatePlayerTable();

    if (this.player) {
      this.player.rack.$populate($("#playRack .Surface"));
      this.swapRack.$populate($("#swapRack"));
    } else {
      $("#playRack .Surface").hide();
    }

    const $board = $("#board");
    game.board.$populate($board);
    this.handle_resize();

    this.$log(true, $.i18n("Game started"), "game-state");

    game.forEachTurn(
      (turn, isLast) => this.$log(
        false, this.game.describeTurn(turn, this.player, isLast)));

    this.$log(true, ""); // Force scroll to end of log

    if (game.turns.length > 0)
      $("#undoButton").toggle(this.game.allowUndo === true);

    if (game.hasEnded()) {
      if (game.nextGameKey)
        this.setAction("action_nextGame", $.i18n("Next game"));
      else
        this.setAction("action_anotherGame", $.i18n("Another game?"));
    }

    $(".pauseButton")
    .toggle(typeof game.timerType !== "undefined");

    $(".distributionButton")
    .on("click", () => this.showLetterDistributions());

    $("#undoButton")
    .on(
      "click", () => {
        // unplace any pending move
        this.takeBackTiles();
        this.sendCommand(Game.Command.UNDO);
      });

    $("#redoButton")
    .hide()
    .on(
      "click", () => {
        if (this.undoStack.length > 0) {
          const turn = this.undoStack.pop();
          this.sendCommand(Game.Command.REDO, turn);
          if (this.undoStack.length === 0)
            $("#redoButton").hide();
        }
      });

    let myGo = this.isThisPlayer(game.whosTurnKey);
    this.updateWhosTurn();
    this.lockBoard(!myGo);
    this.enableTurnButton(myGo || game.hasEnded());

    this.updateGameStatus();

    const lastTurn = game.lastTurn();
    if (lastTurn && (lastTurn.type === Game.Turns.PLAYED
                     || lastTurn.type === Game.Turns.CHALLENGE_LOST)) {
      if (this.isThisPlayer(lastTurn.playerKey)) {
        // It isn't our turn, but we might still have time to
        // change our minds on the last move we made
        if (game.allowTakeBack)
          this.addTakeBackPreviousButton(lastTurn);
      } else
        // It wasn't our go, enable a challenge
        this.addChallengePreviousButton(lastTurn);
    }

    if (this.player) {
      $(".shuffle-button")
      .button({
        showLabel: false,
        icon: "shuffle-icon",
        classes: {
          "ui-button-icon": "fat-icon"
        }
      })
      .on("click", () => this.shuffleRack());

      $(".unplace-button").button({
        showLabel: false,
        icon: "unplace-icon",
        classes: {
          "ui-button-icon": "fat-icon"
        }
      })
      .on("click", () => this.takeBackTiles());

      $(".turn-button")
      .on("click", () => this.click_turnButton());
    } else {
      $(".shuffle-button").hide();
      $(".turn-button").hide();
    }

    return Promise.resolve();
  }

  /**
   * Called when the UI is ready and a player is connected, so we're ready
   * to listen to game events. Use to update the UI to reflect the game state.
   * Default implementation is a NOP.
   * @memberof browser/GameUIMixin
   * @instance
   */
  readyToListen() {
    const playerKey = this.player ? this.player.key : undefined;
    // Confirm to the server that we're ready to listen
    console.debug("f<b join");
    // This will throw if there is no server on the other end
    this.notifyBackend(Game.Notify.JOIN, {
      gameKey: this.game.key,
      playerKey: playerKey
    });
    return Promise.resolve();
  }

  /**
   * Promise to attach listeners to notification coming over the given
   * channel.
   * @return {Promise} promise that resolves to undefined
   * @memberof browser/GameUIMixin
   * @instance
   */
  attachChannelHandlers() {

    assert(this.channel, "No channel");

    this.channel

    .on(Game.Notify.CONNECTIONS, observers =>
        this.handle_CONNECTIONS(observers))

    // A turn has been taken. turn is a Turn
    .on(Game.Notify.TURN,
        turn => this.handle_TURN(
          new this.game.constructor.CLASSES.Turn(turn)))

    // Backend clock tick.
    .on(Game.Notify.TICK,
        params => this.handle_TICK(params))

    // A follow-on game is available
    .on(Game.Notify.NEXT_GAME,
        params => this.handle_NEXT_GAME(params))

    // A message has been sent
    .on(Game.Notify.MESSAGE,
        message => this.handle_MESSAGE(message))

    // Attempted play has been rejected
    .on(Game.Notify.REJECT,
        params => this.handle_REJECT(params))

    // Game has been paused
    .on(Game.Notify.PAUSE,
        params => this.handle_PAUSE(params))

    // Game has been unpaused
    .on(Game.Notify.UNPAUSE,
        params => this.handle_UNPAUSE(params))

    // An UNDO has been serviced
    .on(Game.Notify.UNDONE,
        message => this.handle_UNDONE(message))

    .on(Game.Notify.JOIN, () => console.debug("f<b join"));

    return Promise.resolve();
  }

  /**
   * Handle a screen resize, switching into porttrait mode as required
   * @memberof browser/GameUIMixin
   * @instance
   */
  handle_resize() {
    if (!this.game)
      return;
    const ww = $(window).width();
    const wh = $(window).height();
    // Board is always square, so only need one axis
    const sz = this.game.board.cols;
    const landscape = ww > wh;
    // Constrain board to 90% of screen height in landscape, and the
    // full screen width in portrait capped at 90% of the screen height
    const available = landscape ? (wh * 0.9) : Math.min(ww, wh * 0.9);
    // A .Surface td has a 2px border-width
    const tdSize = available / sz - 4;
    this.editCSSRule(".Surface td", {
      width: tdSize,
      height: tdSize,
      // The font size and line height govern the underlay
      "font-size": tdSize * 0.23,
      "line-height": tdSize / 3
    });

    // A tile has a 3px border-width
    const tileBorderWidth = Math.min(tdSize / 11, 3);
    const tileSize = tdSize - tileBorderWidth * 2;
    this.editCSSRule(".Tile", {
      width: tileSize,
      height: tileSize,
      // and the base font size is 55% of that
      "font-size": tileSize * 0.55,
      "border-width": tileBorderWidth
    });
  }

  /**
   * Implements UI
   * @override
   * @memberof browser/GameUIMixin
   * @instance
   */
  attachUIEventHandlers() {

    super.attachUIEventHandlers();

    // Configure chat input
    const ui = this;

    $("#chatInput")

    .on("keydown", event => {
      // Tab and Escape both blur the input
      if (event.key === "Tab" || event.key === "Escape")
        $("body").focus();
    })

    .on("change", function() {
      // Send chat
      console.debug("f>b message");
      ui.notifyBackend(Game.Notify.MESSAGE, {
        sender: ui.player ? ui.player.name : "Observer",
        text: $(this).val()
      });
      $(this).val("");
      $("body").focus();
    });

    $(".pauseButton")
    .hide()
    .on("click", () => this.sendCommand(Game.Command.PAUSE));

    // Events raised by game components to request UI updates
    $(document)

    .on(UIEvents.SELECT_SQUARE,
        (e, square) => this.selectSquare(square))

    .on(UIEvents.CLEAR_SELECT,
        () => this.clearSelect())

    .on(UIEvents.DROP_TILE,
        (e, source, square) => this.dropTile(source, square))

    // Keydown anywhere in the document
    .on("keydown", event => this.keyDown(event));

    $(window).on("resize", () => this.handle_resize());
  }

  /**
   * Handle a letter being typed when the typing cursor is active
   * @memberof browser/GameUIMixin
   * @instance
   * @param {string} letter character being placed
   */
  manuallyPlaceLetter(letter) {
    if (!this.selectedSquare
        || !this.selectedSquare.isEmpty()
        // Make sure the selected square is on the board!
        || !this.selectedSquare.isBoard)
      return;

    // check it's supported
    if (this.game.letterBag.legalLetters.indexOf(letter) < 0)
      return;

    // Find the letter in the rack
    const rackSquare = this.player.rack.findSquare(letter);
    if (rackSquare) {
      // moveTile will use a blank if the letter isn't found
      this.moveTile(rackSquare, this.selectedSquare, letter);
      if (this.getSetting("tile_click"))
        this.playAudio("tiledown");
      if ($("#typingCursor").hasClass("down"))
        this.moveTypingCursor(0, 1);
      else
        this.moveTypingCursor(1, 0);
    } else
      this.$log($.i18n("nfy-on-rack", letter));
  }

  /**
   * When a letter has been typed, move the cursor skipping over
   * tiles. If the edge of the board is reached, ignore the
   * move.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {number} col column deltae
   * @param {number} row row delta
   */
  moveTypingCursor(col, row) {
    if (!this.selectedSquare)
      return;

    const old = this.selectedSquare;
    do {
      try {
        const nusq = this.game.board.at(
          this.selectedSquare.col + col,
          this.selectedSquare.row + row);
        this.selectedSquare = nusq;
      } catch (e) {
        // off the board.
        beep();
        return;
      }
    } while (this.selectedSquare && !this.selectedSquare.isEmpty());

    if (this.selectedSquare) {
      old.select(false);
      this.selectedSquare.select(true);
    } else if (old) {
      this.selectedSquare = old;
      beep();
    }
  }

  /**
   * Selection is used both for click-click tile moves when dragging
   * isn't available, and for the typing cursor.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {Square} square square to select
   */
  selectSquare(square) {
    assert(square, "No square selected");
    console.debug(`select ${square.squid}`);

    // Is the target square on the board and occupied by a locked tile?
    const isLocked = square.isBoard && square.hasLockedTile();

    // Is the target square an empty square on a rack?
    const isRackVoid = !square.isBoard && square.isEmpty();

    // Is a square already selected?
    if (this.selectedSquare) {
      if (this.selectedSquare.isEmpty()) {
        if (square === this.selectedSquare) {
          // Same square selected again
          this.rotateTypingCursor();
          return;
        }
        // Selecting a different square
      }
      else {
        // The selected square has a tile on it. Is the square
        // being selected empty?

        if (square && square.isEmpty()) {
          // It's empty, so this is a move
          this.moveTile(this.selectedSquare, square);
          this.clearSelect();
          return;
        }

        if (isLocked)
          // Target occupied and locked, can't move and can't select,
          // so ignore, keeping the old selection.
          return;

        // Selecting a different square
      }
      // Switch off the selection on the old square
      this.clearSelect();
    }

    // No pre-selection, or prior selection cancelled.

    if (isLocked || isRackVoid)
      // Only unlocked & empty squares on the board
      return;

    this.selectedSquare = square;
    square.select(true);
  }

  /**
   * Clear the current square selection
   * @memberof browser/GameUIMixin
   * @instance
   * @private
   */
  clearSelect() {
    if (this.selectedSquare) {
      this.selectedSquare.select(false);
      this.selectedSquare = undefined;
    }
  }

  /**
   * Swap the typing cursor between across and down.
   * @memberof browser/GameUIMixin
   * @instance
   * @private
   */
  rotateTypingCursor() {
    const $tc = $("#typingCursor");
    if ($tc.hasClass("down"))
      $tc.removeClass("down");
    else
      $tc.addClass("down");
  }

  /**
   * If the typing cursor is active, move back in the direction
   * it is set to an unplace the next unlocked tile encountered
   * @memberof browser/GameUIMixin
   * @instance
   * @private
   */
  unplaceLastTyped() {
    if (!this.selectedSquare || $("#typingCursor").is(":hidden"))
      return;
    let row = 0, col = 0;
    if ($("#typingCursor").hasClass("down"))
      row = -1;
    else
      col = -1;

    let sq = this.selectedSquare;
    do {
      try {
        sq = this.game.board.at(sq.col + col, sq.row + row);
      } catch (e) {
        // off the board
        sq = undefined;
      }
    } while (sq && sq.hasLockedTile());
    if (sq && !sq.isEmpty()) {
      // Unplace the tile, returning it to the rack
      this.takeBackTile(sq);
      this.selectSquare(sq);
    }
  }

  /**
   * Handler for 'DropTile' event, invoked when a tile has
   * been dropped on a square.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {Square} fromSquare the square the tile is coming from
   * @param {Square} toSquare the square the tile is moving to
   * @private
   */
  dropTile(fromSquare, toSquare) {
    if (fromSquare.tile) {
      this.clearSelect();
      this.moveTile(fromSquare, toSquare);
      if (this.getSetting("tile_click"))
        this.playAudio("tiledown");
    }
  }

  /**
   * Show letter distributions dialog (non-modal)
   * @memberof browser/GameUIMixin
   * @instance
   * @private
   */
  showLetterDistributions() {
    this.getEdition(this.game.edition)
    .then(dist => {
      const $dlg = $("#distributionDialog");
      const $tab = $dlg.find(".distribution");
      $tab.empty();
      $tab.append(
        dist.bag.map(t => t.isBlank ? `${$.i18n("BLANK")}-${t.count}`
                     : `${t.letter}-${t.count}`).join(" "));

      $dlg.dialog({
        title: $.i18n("title-dist-dlg"),
        modal: false,
        closeText: "hide"
      });
    });
  }

  /**
   * Promise to prompt for a letter for a blank
   * @memberof browser/GameUIMixin
   * @instance
   * @return {Promise} Promise that resolves to the chosen letter
   * @private
   */
  promptForLetter() {
    return new Promise(resolve => {
      const $dlg = $("#blankDialog");
      const $tab = $("#blankDialog .letterTable");
      $tab.empty();
      const ll = this.game.letterBag.legalLetters.slice().sort();
      const dim = Math.ceil(Math.sqrt(ll.length));
      let rowlength = dim;
      let $row = null;
      while (ll.length > 0) {
        const letter = ll.shift();
        if (rowlength == dim) {
          if ($row)
            $tab.append($row);
          $row = $(document.createElement("tr"));
          rowlength = 0;
        }
        const $td = $(`<td>${letter}</td>`);
        $td.on("click", () => {
          $dlg.dialog("close");
          resolve(letter);
        });
        $row.append($td);
        rowlength++;
      }
      if ($row)
        $tab.append($row);

      $dlg.dialog({
        dialogClass: "no-title",
        modal: true,
        closeOnEscape: false,
        closeText: "hide"
      });
    });
  }

  /**
   * Move a tile from one surface to another e.g. from the
   * rack to the board
   * @memberof browser/GameUIMixin
   * @instance
   * @param {Square} fromSquare the square the tile is coming from
   * @param {Square} toSquare the square the tile is moving to
   * @param {string} ifBlank (optional) if the tile is blank and we are
   * moving it to the board, then assign it this letter. Otherwise
   * a dialog will prompt for the letter.
   * @private
   */
  moveTile(fromSquare, toSquare, ifBlank) {

    const tile = fromSquare.tile;

    if (this.boardLocked && (fromSquare.isBoard || toSquare.isBoard))
      return; // can't move to/from locked board

    fromSquare.unplaceTile();
    if (tile.isBlank) {
      if (!toSquare.isBoard) {
        tile.reset();
      } else if (ifBlank) {
        tile.letter = ifBlank;
      } else if (tile.letter === " ") {
        this.promptForLetter()
        .then(letter => {
          tile.letter = letter;
          tile.$ui(); // Force a refresh of the tile
        });
      }
    }
    toSquare.placeTile(tile);

    window.setTimeout(() => this.updateGameStatus(), 500);
  }

  /**
   * Update the UI to reflect the status of the game. This handles
   * board locking and display of the turn button. It doesn't
   * affect buttons embedded in the log.
   * @memberof browser/GameUIMixin
   * @instance
   * @private
   */
  updateGameStatus() {
    $("#playBlock > .your-move").empty();
    this.updateTileCounts();

    if (this.game.hasEnded()) {
      // moveAction will be one of confirmGameOver, anotherGame
      // or nextGame, so don't hide the turn button
      this.lockBoard(true);
      return;
    }

    // If this player is not the current player, their only
    // allowable is a challenge, which is handled using a button
    // in the log, so we can hide the turn button
    if (!this.isThisPlayer(this.game.whosTurnKey)) {
      $(".turn-button").hide();
      return;
    }

    // If the last player's rack is empty, it couldn't be refilled
    // and the game might be over.
    const lastPlayer = this.game.previousPlayer();
    if (lastPlayer && lastPlayer.rack.isEmpty()) {
      this.lockBoard(true);
      if (this.player.key === this.game.whosTurnKey)
        this.setAction("action_confirmGameOver",
                       $.i18n("Accept last move"));
      else
        $(".turn-button").hide();
      return;
    }

    // Check if player has placed any tiles
    if (this.game.board.hasUnlockedTiles()) {
      // move action is to make the move
      this.setAction("action_commitMove", $.i18n("Finished Turn"));
      // Check that the play is legal
      const move = this.game.board.analysePlay();
      const $move = $("#playBlock > .your-move");
      if (typeof move === "string") {
        // Play is bad (move will be an i18n string)
        $move.append(move);
        this.enableTurnButton(false);
      } else {
        // Play is legal, calculate bonus if any
        const bonus =
              this.game.calculateBonus(move.placements.length);
        move.score += bonus;
        $move.append(this.game.$formatScore(move, !this.game.predictScore));
        this.enableTurnButton(true);
      }

      // Use 'visibility' and not 'display' to keep the layout stable
      $(".unplace-button").css("visibility", "inherit");
      $("#swapRack").hide();
      return;
    }

    if (this.swapRack.squaresUsed() > 0) {
      // Swaprack has tiles on it, change the move action to swap
      this.setAction("action_swap", $.i18n("Swap"));
      $("#board .ui-droppable").droppable("disable");
      this.enableTurnButton(true);
      $(".unplace-button").css("visibility", "inherit");
      return;
    }

    // Otherwise nothing has been placed, turn action is a pass
    this.setAction("action_pass", $.i18n("Pass"));
    $("#board .ui-droppable").droppable("enable");
    this.enableTurnButton(true);
    $(".unplace-button").css("visibility", "hidden");
  }

  /**
   * Set board locked status. The board is locked when it's
   * not this player's turn.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {boolean} newVal new setting of "locked"
   */
  lockBoard(newVal) {
    this.boardLocked = newVal;
  }

  /**
   * Enable/disable the turn button
   * @memberof browser/GameUIMixin
   * @instance
   * @param {boolean} enable true to enable, disable otherwise
   */
  enableTurnButton(enable) {
    $(".turn-button").button(enable ? "enable" : "disable");
  }

  /**
   * Add a 'Challenge' button to the log pane to challenge the last
   * player's move (if it wasn't us)
   * @memberof browser/GameUIMixin
   * @instance
   * @param {Turn} turn the current turn
   * @private
   */
  addChallengePreviousButton(turn) {
    if (!this.player)
      return;
    const player = this.game.getPlayerWithKey(turn.playerKey);
    if (!player)
      return;
    const text = $.i18n(
      "button-challenge", player.name);
    const $button =
          $(`<button>${text}</button>`)
          .addClass("moveAction")
          .button()
          .on("click", () => this.challenge(player.key));
    this.$log(true, $button, "turn-control");
  }

  /**
   * Add a 'Take back' button to the log pane to take back
   * (this player's) previous move, if the game allows it.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {Turn} turn the current turn
   */
  addTakeBackPreviousButton() {
    const $button =
          $(`<button name="takeBack" class="moveAction"></button>`)
          .text($.i18n("Take back"))
          .button()
          .on("click", () => this.takeBackMove());
    this.$log(true, $button, "turn-control");
  }

  /**
   * Remove any action buttons from the log pane.
   * @memberof browser/GameUIMixin
   * @instance
   */
  removeMoveActionButtons() {
    $("button.moveAction").remove();
  }

  /**
   * Issue a challenge against the given player.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {string} challengedKey key of the player being challenged
   */
  challenge(challengedKey) {
    this.takeBackTiles();
    this.sendCommand(Game.Command.CHALLENGE, {
      challengedKey: challengedKey
    });
  }

  /**
   * Handler for the 'Make Move' button. Invoked via 'click_turnButton'.
   * Response will be turn type Game.Turns.PLAYED (or Game.Turns.TOOK_BACK if the play
   * is rejected).
   * @memberof browser/GameUIMixin
   * @instance
   */
  action_commitMove() {
    $(".hint-placement").removeClass("hint-placement");

    const move = this.game.board.analysePlay();
    assert(typeof move !== "string", `Bad move: ${move}`);

    const bonus = this.game.calculateBonus(move.placements.length);
    move.score += bonus;
    if (bonus > 0 && this.getSetting("cheers"))
      this.playAudio("bonusCheer");

    this.sendCommand(Game.Command.PLAY, move);
  }

  /**
   * Handler for the 'Take back' button clicked. Invoked via
   * 'click_turnButton'. Response will be a turn type Game.Turns.TOOK_BACK.
   * @memberof browser/GameUIMixin
   * @instance
   */
  takeBackMove() {
    this.takeBackTiles();
    this.sendCommand(Game.Command.TAKE_BACK);
  }

  /**
   * Handler for the 'Pass' button clicked. Invoked via 'click_turnButton'.
   * @memberof browser/GameUIMixin
   * @instance
   */
  action_pass() {
    this.takeBackTiles();
    this.sendCommand(Game.Command.PASS);
  }

  /**
   * Handler for the 'Confirm move' button clicked. Invoked
   *  via 'click_turnButton'. The response may contain a score adjustment.
   * @memberof browser/GameUIMixin
   * @instance
   */
  action_confirmGameOver() {
    this.takeBackTiles();
    this.sendCommand(Game.Command.CONFIRM_GAME_OVER);
  }

  /**
   * Handler for the 'Another game?" button.
   * Invoked via click_turnButton.
   * @memberof browser/GameUIMixin
   * @instance
   * @abstract
   */
  action_anotherGame() {
    assert.fail("GameUIMixin.action_nextGame");
  }

  /**
   * Handler for the 'Next game" button. Invoked via click_turnButton.
   * Implement in subclass/mixin.
   * @memberof browser/GameUIMixin
   * @instance
   * @abstract
   */
  action_nextGame() {
    assert.fail("GameUIMixin.action_nextGame");
  }

  /**
   * Handler for the 'Swap' button clicked. Invoked via 'click_turnButton'.
   * @memberof browser/GameUIMixin
   * @instance
   */
  action_swap() {
    const tiles = this.swapRack.empty();
    // Move the swapRack tiles back to the playRack until the play
    // is confirmed
    this.player.rack.addTiles(tiles);
    this.sendCommand(Game.Command.SWAP, tiles);
  }

  /**
   * Set the action when the turn button is pressed.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {string} action function name e.g. action_commitMove
   * @param {string} title button title e.g. "Commit Move"
   * @private
   */
  setAction(action, title) {
    if (this.player) {
      $(".turn-button")
      .data("action", action)
      .empty()
      .append(title)
      .show();
    }
  }

  /**
   * Handler for a click on the 'Make Move' button. This button
   * may be associated with different actions depending on the
   * state, through the 'data-action' attribute.
   *
   * * 'commitMove' will send the current tile placements to the server
   * * 'swap' will sawp the tiles currently on the swap rack
   * * 'pass' will pass the current move (set when no tiles are placed)
   *
   * This action will map to the matching function in 'this'.
   * @memberof browser/GameUIMixin
   * @instance
   */
  click_turnButton() {
    const action = $(".turn-button").data("action");
    console.debug("click_turnButton =>", action);
    this[action]();
  }

  /**
   * Handler for a click on the 'Take Back' button, to pull
   * back tiles from the board and swap rack
   * @memberof browser/GameUIMixin
   * @instance
   * @param {boolean} noswap true to not take tiles back from
   * the swap rack.
   */
  takeBackTiles(noswap) {
    this.game.board.forEachSquare(
      boardSquare => {
        this.takeBackTile(boardSquare);
        return false;
      });
    if (!noswap)
      this.swapRack.forEachSquare(
        swapSquare => {
          this.takeBackTile(swapSquare);
          return false;
        });

    this.updateGameStatus();
  }

  /**
   * Take back a single tile from the given square.
   * @memberof browser/GameUIMixin
   * @instance
   * @param {Square} square the square with the tile being taken back
   * @return {boolean} true if a tile was returned
   */
  takeBackTile(square) {
    if (square.hasLockedTile())
      return false;

    const tile = square.unplaceTile();
    if (tile) {
      this.player.rack.addTile(tile);
      return true;
    }
    return false;
  }

  /**
   * Handler for click on the 'Shuffle' button
   * @memberof browser/GameUIMixin
   * @instance
   */
  shuffleRack() {
    this.player.rack.shuffle();
  }

  /**
   * Handler for click on the 'Undo' button
   * @memberof browser/GameUIMixin
   * @instance
   */
  undo() {
    this.sendComand(Game.Command.UNDO);
  }

  /**
   * Handler for click on the 'redo' button
   * @memberof browser/GameUIMixin
   * @instance
   */
  redo() {
  }

  /**
   * Promise to check if we have been granted permission to
   * create Notifications.
   * @instance
   * @memberof client/ClientUIMixin
   * @return {Promise} Promise that resolves to undefined if we can notify
   */
  canNotify() {
    const usingHttps = document.URL.indexOf("https:") === 0;

    if (!(usingHttps
          && this.getSetting("notification")
          && "Notification" in window))
      return Promise.reject();

    switch (Notification.permission) {
    case "denied":
      return Promise.reject();
    case "granted":
      return Promise.resolve();
    default:
      return new Promise((resolve, reject) => {
        return Notification.requestPermission()
        .then(result => {
          if (result === "granted")
            resolve();
          else
            reject();
        });
      });
    }
  }

  /**
   * Generate a notification using the HTML5 notifications API
   * @instance
   * @memberof client/ClientUIMixin
   * @param {string} title notification title
   * @param {string} body notification body
   */
  notify(title, body) {
    this.canNotify()
    .then(() => {
      this.cancelNotification();
      const notification = new Notification(
        title,
        {
          icon: "../images/favicon.ico",
          body: body
        });
      this._notification = notification;
      $(notification)
      .on("click", function () {
        this.cancel();
      })
      .on("close", () => {
        delete this._notification;
      });
    })
    .catch(() => {});
  }

  /**
   * Cancel any outstanding Notification
   * @instance
   * @memberof client/ClientUIMixin
   */
  cancelNotification() {
    if (this._notification) {
      this._notification.close();
      delete this._notification;
    }
  }
};

export { GameUIMixin }
