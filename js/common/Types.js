/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

/**
 * Grouping together enumerated types
 */
define(() => {

  /**
   * See {@linkcode https://nodejs.org/api/http.html|http.ServerRequest}
   * @typedef {http.ServerRequest} Request
   */

  /**
   * See {@linkcode https://nodejs.org/api/http.html|http.ServerResponse}
   * @typedef {http.ServerResponse} Response
   */

  /**
   * A 16-character key that uniquely identifies a player or a game.
   * @typedef {string} Key
   */

  /**
   * Game states.
   * * WAITING - until enough players join the game
   * * PLAYING - until the game is over, then one of:
   * * GAME_OVER - game was played to end, or
   * * TWO_PASSES - all players passed twice, or
   * * FAILED_CHALLENGE - a challenge on the final play failed, or
   * * TIMED_OUT - game is too old, will be pruned
   * @typedef {WAITING|PLAYING|GAME_OVER|TWO_PASSES|FAILED_CHALLENGE|TIMED_OUT} State
   */
  const State = {
    WAITING:          /*i18n*/"Waiting for players",
    PLAYING:          /*i18n*/"Playing",
    GAME_OVER:        /*i18n*/"Game over",
    TWO_PASSES:       /*i18n*/"log-all-passed",
    FAILED_CHALLENGE: /*i18n*/"Challenge failed",
    TIMED_OUT:        /*i18n*/"Timed out"
  };

  /**
   * Commands that can be sent from the UI to the Server.
   * @typedef {UNPAUSE|PAUSE|CHALLENGE|PLAY|TAKE_BACK|PASS|GAME_OVER|SWAP} Command
   */
  const Command = {
    CHALLENGE:         "challenge",
    CONFIRM_GAME_OVER: "confirmGameOver",
    PASS:              "pass",
    PAUSE:             "pause",
    PLAY:              "play",
    REDO:              "redo",
    SWAP:              "swap",
    TAKE_BACK:         "takeBack",
    UNDO:              "undo",
    UNPAUSE:           "unpause"
  };

  /**
   * Notifications sent to game pages by the server.
   * * `CONNECTIONS`: list of the currently connected observers
   * * `MESSAGE`: someone has sent a message
   * * `NEXT_GAME`: a follow-on game is available
   * * `PAUSE`: someone paused the game
   * * `REJECT`: a move has been rejected (not found in dictionary)
   * * `TICK`: the game timer has ticked
   * * `TURN`: someone has made a move in the game
   * * `UNDONE`: the last play was undone
   * * `UNPAUSE`: someone has unpaused the game
   * Notifications only sent to games pages by the server
   * * `UPDATE`: a change has been made that requires a monitor update
   * Notifications sent by a game page
   * * `JOIN`: request to join (or observe) the game
   * Notifications sent by games pages (monitors)
   * * `MONITOR`: monitor wants to connect to the server
   * @typedef {UNPAUSE|PAUSE|JOIN|REJECT|MESSAGE|NEXT_GAME|TICK|TURN|CONNECTIONS|UPDATE|MONITOR} Notify
   */
  const Notify = {
    ANOTHER_GAME: "another game",
    CONNECTIONS:  "connections",
    JOIN:         "join game",
    MESSAGE:      "message",
    NEXT_GAME:    "next game",
    PAUSE:        "pause game",
    REJECT:       "reject play",
    TICK:         "tick timer",
    TURN:         "play turn",
    UNDONE:       "undone",
    UNPAUSE:      "unpause",

    /* Notifications sent to monitors (games pages) */
    UPDATE:       "update",
    MONITOR:      "monitor"
  };

  /**
   * Types of game timer
   * * NONE - game is untimed
   * * TURN - each turn is time-limited
   * * GAME - game is time limited, and a points penalty is applied for overtime
   * @typedef {NONE|TURN|GAME} Timer
   */
  const Timer = {
    NONE:  undefined,
    TURN:  /*i18n*/"Turn timer",
    GAME:  /*i18n*/"Game timer"
  };

  /**
   * Different types of penalty for a failed challenge.
   * * NONE - no penalty
   * * MISS - challenging player misses next turn
   * * PER_TURN - challenger loses a fixed number of points
   * * PER_WORD - challenger loses points for each wrongly challenged word
   * @typedef {NONE|MISS|PER_TURN|PER_WORD} Penalty
   */
  const Penalty = {
    NONE:     undefined,
    MISS:     /*i18n*/"Miss next turn",
    PER_TURN: /*i18n*/"Lose points",
    PER_WORD: /*i18n*/"label-points-per"
  };

  /**
   * Different types of {@linkcode Turn}
   * * PLAY - some tiles were placed on the board
   * * SWAP - player swapped for fresh tiles from the bag
   * * GAME_OVER - game is over
   * * CHALLENGE_LOST - player challenged, and lost
   * * CHALLENGE_WON - player challenged, and won
   * * TOOK_BACK - player took back their play
   * * PASSED - player passed
   * * TIMED_OUT - player was timed out (if timer type is `TURN`)
   * @typedef {PLAY|SWAP|GAME_OVER|CHALLENGE_LOST|CHALLENGE_WON|TOOK_BACK|PASSED|TIMED_OUT} Turns
   */
  const Turns = {
    PLAYED:         "play",
    SWAPPED:        "swap",
    GAME_ENDED:     "game-over",
    CHALLENGE_LOST: "challenge-lost",
    CHALLENGE_WON:  "challenge-won",
    TOOK_BACK:      "took-back",
    PASSED:         "passed",
    TIMED_OUT:      "timed-out"
  };

  /**
   * Ways to check played words.
   * * NONE - don't check played words
   * * AFTER - report to player (only) if played words were in dictionary
   * * REJECT - refuse to accept words not in the dictionary. A bad play
   *   in this case does not result in a penalty, it just won't accept
   *   the play.
   * @typedef {NONE|AFTER|REJECT} WordCheck
   */
  const WordCheck = {
    NONE:    undefined,
    AFTER:   /*i18n*/"label-check-after",
    REJECT:  /*i18n*/"Reject unknown words"
  };

  /**
   * Events issued by the game code to update the UI - ignored on server side
   * * PLACE_TILE - a tile has just been placed on the square passed
   * * UNPLACE_TILE - a tile has just been removed from the square passed. The
   *   square and the removed tile are passed.
   * * SELECT_SQUARE - the square passed has been selected. This will
   *   either delegate to the tile placed on the square, or enable the
   *   typing cursor on an empty square.
   * * CLEAR_SELECT - clear the current selection (deselect selected tile,
   *   and/or disable the typing cursor)
   * * DROP_TILE - a tile has been drag/dropped on the square passed. The
   *   source and destination squares are passed.
   * @typedef {PLACE_TILE|UNPLACE_TILE|SELECT_SQUARE|CLEAR_SELECT|DROP_TILE} UIEvents
   */
  const UIEvents = {
    CLEAR_SELECT:  "ClearSelect",
    DROP_TILE:     "DropTile",
    PLACE_TILE:    "PlaceTile",
    SELECT_SQUARE: "SelectSquare",
    UNPLACE_TILE:  "UnplaceTile"
  };

  // ordered types for <select>s in UI
  Timer._types = [
    Timer.NONE, Timer.TURN, Timer.GAME
  ];

  Penalty._types = [
    Penalty.PER_WORD, Penalty.PER_TURN,
    Penalty.MISS, Penalty.NONE
  ];

  WordCheck._types = [
    WordCheck.NONE, WordCheck.AFTER, WordCheck.REJECT
  ];

  return {
    Command: Command,
    Notify: Notify,
    Penalty: Penalty,
    State: State,
    Timer: Timer,
    Turns: Turns,
    UIEvents: UIEvents,
    WordCheck: WordCheck
  };
});
