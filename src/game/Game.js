/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/* global Platform */

import { Encoder, Decoder, IDREFHandler, TypeMapHandler, KeyDictionaryHandler, TagHandler } from "@cdot/cbor";
import { genKey, stringify } from "../common/Utils.js";
import { Fridge } from "../common/Fridge.js";
import { loadDictionary } from "./loadDictionary.js";
import { Board } from "./Board.js";
import { Edition } from "./Edition.js";
import { LetterBag } from "./LetterBag.js";
import { Move } from "./Move.js";
import { Player } from "./Player.js";
import { Rack } from "./Rack.js";
import { Square } from "./Square.js";
import { Tile } from "./Tile.js";
import { Turn } from "./Turn.js";

// Use the same CBOR tag handler for encoding and decoding, switching the
// typeMap as required. This is Javascript, strictly synchronous.
const CBOR_tagHandler = new (KeyDictionaryHandler(
  IDREFHandler(TypeMapHandler(TagHandler))))({
    added: k => { throw Error(k) },
    keys: [
      // Square
      "type", "surface", "col", "row", "tile", "underlay",
      "letterScoreMultiplier", "wordScoreMultiplier",
      // Tile
      "letter", "score", "isBlank", "isLocked",
      // Surface
      "id", "cols", "rows", "squares", "midrow", "midcol",
      // LetterBag
      "tiles", "legalLetters", "isWild", "predictable",
      // Game
      "key", "state", "creationTimestamp", "players", "turns", "board",
      "rackSize", "swapSize", "bonuses", "letterBag", "whosTurnKey",
      "edition", "dictionary", "timerType", "timeAllowed", "timePenalty",
      "challengePenalty", "penaltyPoints",
      "wordCheck", "minPlayers", "maxPlayers", "predictScore",
      "allowTakeBack", "allowUndo", "syncRacks", "nextGameKey", "pausedBy",
      // Bonus levels
      "3", "4", "5", "6", "7", "8", "9",
      // Player
      "name", "rack", "passes", "clock", "missNextTurn", "wantsAdvice",
      "isRobot", "canChallenge", "delayBeforePlay",
      // Turn
      "gameKey", "playerKey", "nextToGoKey", "timestamp",
      "placements", "replacements", "challengerKey", "endState",
      "tilesRemaining", "time",
      // Move
      "words", "word",
      // findBestPlayController
      "game", "Platform", "data",
      // Replay
      "nextTurn", "predictable",
    ]
  });

/**
 * Class of Game objects. Contains most of the game logic.
 */
class Game {

  /**
   * Factory classes
   * @private
   */
  static CLASSES = {
    Square: Square,
    Tile: Tile,
    Board: Board,
    Game: Game,
    LetterBag: LetterBag,
    Move: Move,
    Player: Player,
    Rack: Rack,
    Turn: Turn
  };

  /**
   * Game states.
   * * `WAITING` - until enough players join the game
   * * `PLAYING` - until the game is over, then one of:
   * * `GAME_OVER` - game was played to end, or
   * * `TWO_PASSES` - all players passed twice, or
   * * `FAILED_CHALLENGE` - a challenge on the final play failed, or
   * * `TIMED_OUT` - game is too old, will be pruned
   * @typedef {WAITING|PLAYING|GAME_OVER|TWO_PASSES|FAILED_CHALLENGE|TIMED_OUT} Game.State
   */
  static State = {
    WAITING:          "Waiting for players",
    PLAYING:          "Playing",
    FAILED_CHALLENGE: "Challenge failed",

    GAME_OVER:        "Game over",
    TWO_PASSES:       "All players passed twice",
    TIMED_OUT:        "Timed out"
  };

  /**
   * Commands that can be sent from the UI to the Backend.
   * @typedef {UNPAUSE|PAUSE|CHALLENGE|PLAY|TAKE_BACK|PASS|GAME_OVER|SWAP} Game.Command
   */
  static Command = {
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
   * Notifications sent between back and front end.
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
   * @typedef {UNPAUSE|PAUSE|JOIN|REJECT|MESSAGE|NEXT_GAME|TICK|TURN|CONNECTIONS|UPDATE|MONITOR} Game.Notify
   */
  static Notify = {
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
   * Different types of {@linkcode Turn}
   * * PLAY - some tiles were placed on the board
   * * SWAP - player swapped for fresh tiles from the bag
   * * GAME_OVER - game is over
   * * CHALLENGE_LOST - player challenged, and lost
   * * CHALLENGE_WON - player challenged, and won
   * * TOOK_BACK - player took back their play
   * * PASSED - player passed
   * * TIMED_OUT - player was timed out (if timer type is `TURN`)
   * @typedef {PLAY|SWAP|GAME_OVER|CHALLENGE_LOST|CHALLENGE_WON|TOOK_BACK|PASSED|TIMED_OUT} Game.Turns
   */
  static Turns = {
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
   * Types of game timer
   * * `NONE` - game is untimed
   * * `TURN` - each turn is time-limited
   * * `GAME` - game is time limited, and a points penalty is applied
   * for overtime
   * @typedef {NONE|TURN|GAME} Game.Timer
   */
  static Timer = {
    NONE:  undefined,
    TURN:  /*i18n*/"Turn timer",
    GAME:  /*i18n*/"Game timer"
  };

  /**
   * Different types of penalty for a failed challenge.
   * * `NONE` - no penalty
   * * `MISS` - challenging player misses next turn
   * * `PER_TURN` - challenger loses a fixed number of points
   * * `PER_WORD` - challenger loses points for each wrongly challenged word
   * @typedef {NONE|MISS|PER_TURN|PER_WORD} Game.Penalty
   */
  static Penalty = {
    NONE:     undefined,
    MISS:     /*i18n*/"Miss next turn",
    PER_TURN: /*i18n*/"Lose points",
    PER_WORD: /*i18n*/"Lose points per word"
  };

  /**
   * Ways to check played words.
   * * NONE - don't check played words
   * * AFTER - report to player (only) if played words were in dictionary
   * * REJECT - refuse to accept words not in the dictionary. A bad play
   *   in this case does not result in a penalty, it just won't accept
   *   the play.
   * @typedef {NONE|AFTER|REJECT} Game.WordCheck
   */
  static WordCheck = {
    NONE:    undefined,
    AFTER:   /*i18n*/"Check words after play",
    REJECT:  /*i18n*/"Reject unknown words"
  };

  /**
   * Channels connecting to front ends
   * @member {Channel[]}
   * @private
   */
  _channels = [];

  // Note that we do NOT use the field syntax for the fields that
  // are serialised. If we do that, then the constructor blows the
  // field away when loading using CBOR.

  /**
   * A new game is constructed from scratch by
   * ```
   * new Game(...).create().then(game => game.onLoad(db)...
   * ```
   * A game identified by key is loaded from a db by
   * ```
   * db.get(key)
   * .then(d => Game.fromCBOR(d, Game.CLASSES))
   * .then(game => game.onLoad(db)...
   * ```
   * @param {object} params Parameter object. This can be another
   * Game to copy game parameters, or a generic object with fields
   * the same name as Game fields.
   * Note that `players` and `turns` are not copied.
   */
  constructor(params) {

    /**
     * Debug function.
     * @member {function}
     * @private
     */
    this._debug = params._debug;

    /**
     * Key that uniquely identifies this game.
     * @member {Key}
     */
    this.key = params.key || genKey();

    /**
     * An i18n message identifier indicating the game state.
     * @member {State}
     */
    this.state = Game.State.WAITING;

    /**
     * Epoch ms when this game was created.
     * @member {number}
     */
    this.creationTimestamp = params.creationTimestamp || Date.now();

    /**
     * List of players in the game.
     * Lateinit as the result of a load.
     * @member {Player[]}
     * @private
     */
    this.players = [];

    /**
     * Complete list of the turn history of this game.
     * @member {Turn[]}
     * @private
     */
    this.turns = [];

    /**
     * The game board.
     * @member {Board}
     */
    this.board = undefined;

    /**
     * Size of rack. Always the same as Edition.rackCount,
     * because we don't hold a pointer to the Edition. Note this
     * is saved with the game.
     * Copied from the {@linkcode Edition} in {@linkcode Game#create|create}.
     * @member {number}
     */
    this.rackSize = undefined;

    /**
     * Size of swap rack.
     * Lateinit in {@linkcode Game#create|create} or as the result of a
     * load.
     * @member {number}
     */
    this.swapSize = undefined;

    /**
     * Map of number of tiles played, to bonus for the play.
     * Lateinit in {@linkcode Game#create|create} or as the result of a
     * load.
     * @member {object<number,number>}
     * @private
     */
    this.bonuses = undefined;

    /**
     * Bag of remaining letters, initialised from the edition.
     * Lateinit in {@linkcode Game#create|create} or as the result of a
     * load.
     * @member {LetterBag}
     */
    this.letterBag = undefined;

    /**
     * Key of next player to play in this game.
     * @member {string?}
     */
    this.whosTurnKey = undefined;

    /**
     * Undo engine for this game. Lazy init when required.
     * @member {Undo?}
     * @private
     */
    this._undoer = undefined;

    /**
     * Name of the edition (see {@linkcode Edition}).
     * Edition objects are stored in the Edition class and
     * demand-loaded as required. This allows us to
     * throw Game objects around without worrying too much about
     * the data volume.
     * @member {string}
     */
    this.edition = params.edition;

    /*
     * When you name a field in a class declaration without an
     * initial value, it gets initialised to undefined. This means the
     * object gets cluttered with undefined fields that are not used
     * in the configuration. So we test whether these optional fields
     * are required or not.
     */

    if (params.dictionary)
      /**
       * Name of the dictionary used for checking words and
       * generating robot plays. A game doesn't need to have a
       * dictionary if words are not checked and there is no robot
       * player.
       * This is just the name of the dictionary. Dictionary objects
       * are stored in the {@linkcode Dictionary} class and
       * demand-loaded as and when required. This allows us to
       * throw Game objects around without worrying too much about
       * the data volume.
       * @member {string?}
       */
      this.dictionary = params.dictionary;

    if (params.timerType && params.timerType !== "none")
      /**
       * Type of timer for this game.
       * @member {Timer?}
       */
      this.timerType = params.timerType;

    if (this.timerType) {
      if (typeof params.timeAllowed !== "undefined")
        /**
         * Time limit for this game, in minutes. If `timerType` is
         * `TIMER_GAME` defaults to 25 minutes, and 1 minute for
         * `TIMER_TURN`.
         * @member {number?}
         */
        this.timeAllowed = params.timeAllowed;
      else
        this.timeAllowed = 0;
      if (this.timeAllowed <= 0) {
        if (this.timerType === Game.Timer.GAME)
          this.timeAllowed = 25; // 25 minutes
        else
          this.timeAllowed = 1; // 1 minute
      }

      if (this.timerType === Game.Timer.GAME)
        /**
         * Time penalty for this game, points lost per minute over
         * timeAllowed. Only used if `timerType` is `TIMER_GAME`.
         * @member {number?}
         */
        this.timePenalty = params.timePenalty || 5;
    }

    /**
     * The type of penalty to apply for a failed challenge.
     * @member {Penalty}
     */
    if (params.challengePenalty && params.challengePenalty !== "none")
      this.challengePenalty = params.challengePenalty;

    if (this.challengePenalty === Game.Penalty.PER_TURN
        || this.challengePenalty === Game.Penalty.PER_WORD)
      /**
       * The score penalty to apply for a failed challenge. Only used
       * if `challengePenalty` is `Game.Penalty.PER_TURN` or `Game.Penalty.PER_WORD`.
       * @member {number?}
       */
      this.penaltyPoints = params.penaltyPoints || 5;

    if (params.wordCheck && params.wordCheck !== "none")
      /**
       * Whether or not to check plays against the dictionary.
       * @member {WordCheck?}
       */
      this.wordCheck = params.wordCheck;

    if (params.minPlayers > 2)
      /**
       * Least number of players must have joined before this game
       * can start. Must be at least 2.
       * @member {number?}
       */
      this.minPlayers = params.minPlayers;

    if (params.maxPlayers > 2)
      /**
       * Most number of players who can join this game. 0
       * means no limit.
       * @member {number?}
       */
      this.maxPlayers = params.maxPlayers;

    if (typeof this.maxPlayers !== "undefined"
        && this.maxPlayers < (this.minPlayers || 2))
      delete this.maxPlayers; // infinity

    if (params.predictScore)
      /**
       * Whether or not to show the predicted score from tiles
       * placed during the game. This should be false in tournament
       * play, true otherwise.
       * @member {?boolean}
       */
      this.predictScore = true;

    if (params.allowTakeBack)
      /**
       * Whether or not to allow players to take back their most recent
       * move without penalty, so long as the next player hasn't
       * challenged or played.
       * @member {boolean?}
       */
      this.allowTakeBack = true;

    if (params.allowUndo)
      /**
       * Whether or not to allow players to undo previous
       * moves without penalty. Implies syncRacks.
       * @member {boolean?}
       */
      this.allowUndo = true;

    if (params.syncRacks)
      /**
       * Disables obfustication of move data, so any player
       * could potentially reverse-engineer
       * the entire board and all racks if this is enabled.
       * @member {boolean?}
       */
      this.syncRacks = true;

    if (params._noPlayerShuffle)
      /**
       * Internal, for debug only.
       * @member {boolean?}
       * @private
       */
      this._noPlayerShuffle = true;

    if (params.nextGameKey)
      /**
       * When a game is ended, nextGameKey is the key for the
       * continuation game.
       * @member {string?}
       */
      this.nextGameKey = params.nextGameKey;

    if (params.pausedBy)
      /**
       * Name of the player who paused the game (if it's paused).
       * @member {string?}
       */
      this.pausedBy = params.pausedBy;
  }

  /**
   * Creation steps that can't be done in the constructor because
   * they require promises.
   * Load the edition and create the board and letter bag.
   * Not done in the constructor because we need to return
   * a Promise. Must be followed by onLoad to connect a
   * DB and complete initialisation of private fields.
   * @return {Promise} that resolves to this
   */
  create() {
    return this.getEdition()
    .then(edo => {
      const factory = this.constructor.CLASSES;
      this.board = new factory.Board(factory, edo);
      this.letterBag = new LetterBag(edo);
      this.bonuses = edo.bonuses;
      this.rackSize = edo.rackCount;
      this.swapSize = edo.swapCount;
      return this;
    });
  }

  /**
   * Get the edition for this game, lazy-loading as necessary
   * @return {Promise} resolving to an {@linkcode Edition}
   */
  getEdition() {
    return Edition.load(this.edition);
  }

  /**
   * Add a player to the game.
   * @param {Player} player
   * @param {boolean?} fillRack true to fill the player's rack
   * from the game's letter bag.
   * @return {Game} this
   */
  addPlayer(player, fillRack) {
    assert(this.letterBag, "Cannot addPlayer() before create()");
    assert(
      !this.maxPlayers || this.players.length < this.maxPlayers,
      "Cannot addPlayer() to a full game");
    player._debug = this._debug;
    this.players.push(player);
    if (this.timerType)
      player.clock = this.timeAllowed * 60;
    if (fillRack)
      player.fillRack(this.letterBag, this.rackSize);
    /* istanbul ignore if */
    if (this._debug)
      this._debug(this.key, "added player", player.stringify());
    return this;
  }

  /**
   * Remove a player from the game, taking their tiles back into
   * the bag
   * @param {Player} player
   */
  removePlayer(player) {
    player.returnTiles(this.letterBag);
    const index = this.players.findIndex(p => p.key === player.key);
    assert(index >= 0,
           `No such player ${player.key} in ${this.key}`);
    this.players.splice(index, 1);
    /* istanbul ignore if */
    if (this._debug)
      this._debug(player.key, "left", this.key);
    if (this.players.length < (this.minPlayers || 2)
        && this.state !== Game.State.GAME_OVER)
      this.state = Game.State.WAITING;
  }

  /**
   * Get the player with key
   * @param {string} player key
   * @return {Player} player, or undefined if not found
   */
  getPlayerWithKey(key) {
    return this.players.find(p => p.key === key);
  }

  /**
   * Get the current player.
   * @return {Player} player, or undefined if not found
   */
  getPlayer() {
    return this.getPlayerWithKey(this.whosTurnKey);
  }

  /**
   * Get a list of all players in the game
   * @return {Player[]} list of players
   */
  getPlayers() {
    return this.players;
  }

  /**
   * Get the last player before the given player, identified by key
   * @param {string|Player} player the current player if undefined, or
   * the player to get the previous player of
   * @return {Player} previous player
   */
  previousPlayer(player) {
    if (typeof player === "undefined")
      player = this.getPlayer();
    else if (typeof player === "string")
      player = this.getPlayerWithKey(player);
    const index = this.players.findIndex(p => p.key === player.key);
    assert(index >= 0, `${player.key} not found in ${this.key}`);
    return this.players[
      (index + this.players.length - 1) % this.players.length];
  }

  /**
   * Get the next player to play. A player might be skipped if they
   * are marked as missing a turn.
   * @param {string|Player} player the current player if undefined,
   * or the key of a player, or the player
   * of the player to get the next player to
   * @return {Player} the next player
   */
  nextPlayer(player) {
    if (typeof player === "undefined")
      player = this.getPlayer();
    else if (typeof player === "string")
      player = this.getPlayerWithKey(player);
    let index = this.players.findIndex(p => p.key === player.key);
    assert(index >= 0, `${player.key} not found in ${this.key}`);
    for (let i = 0; i < this.players.length; i++) {
      let nextPlayer = this.players[(index + 1) % this.players.length];
      if (nextPlayer.missNextTurn) {
        nextPlayer.missNextTurn = false;
        index++;
      } else
        return nextPlayer;
    }
    /* istanbul ignore next */
    return assert.fail(
      `Unable to determine next player after ${player.key}`);
  }

  /**
   * Calculate any bonus afforded to plays of this length
   * @param {number} tilesPaced number of tiles placed
   * @return points bonus
   */
  calculateBonus(tilesPlaced) {
    // Duplicates Edition.calculateBonus, so it can be used even if
    // the Edition is not loaded (e.g. on the client side)
    return this.bonuses ? (this.bonuses[tilesPlaced] || 0) : 0;
  }

  /**
   * Get the current winning score
   * @return {number} points
   */
  winningScore() {
    return this.players.reduce(
      (max, player) => Math.max(max, player.score), 0);
  }

  /**
   * Get the current winning player
   * @return {Player} player in the lead
   */
  getWinner() {
    return this.players.reduce(
      (best, player) => (player.score > best.score ? player : best),
      this.players[0]);
  }

  /**
   * If there is a player with no tiles, return them.
   * @return {Player} the player with no tiles, or undefined
   */
  getPlayerWithNoTiles() {
    return this.players.find(
      player => (player.rack.tiles().length === 0));
  }

  /**
   * Return true if the game state indicates the game has ended
   */
  hasEnded() {
    switch (this.state) {
    case Game.State.WAITING:
    case Game.State.FAILED_CHALLENGE:
    case Game.State.PLAYING:
      return false;
    case undefined:
    case Game.State.GAME_OVER:
    case Game.State.TWO_PASSES:
    case Game.State.TIMED_OUT:
      return true;
    default:
      assert.fail(`Bad game state ${this.state}`);
      return true;
    }
  }

  /**
   * Determine when the last activity on the game happened. This
   * is either the last time a turn was processed, or the creation time.
   * @return {number} a time in epoch ms
   */
  lastActivity() {
    const last = this.lastTurn();
    if (last)
      return last.timestamp;

    return this.creationTimestamp;
  }

  /**
   * Get the last turn made in this game.
   * @return {Turn} the last turn recorded for the game, or undefined
   * if no turns have been made yet.
   */
  lastTurn() {
    if (this.turns.length === 0)
      return undefined;

    return this.turns[this.turns.length - 1];
  }

  /**
   * Add a turn to the game
   * @param {Turn} the turn to add
   */
  pushTurn(turn) {
    return this.turns.push(turn);
  }

  /**
   * Remove and return the last turn in the game
   * @return {Turn} the turn popped
   */
  popTurn() {
    assert(this.turns.length > 0, "No turns");
    return this.turns.pop();
  }

  /**
   * Iterate over turns calling cb on each, flagging when the
   * last (most recent) turn is reached.
   * @param {function} cb (turn, isLastTurn)
   */
  forEachTurn(cb) {
    this.turns.forEach(
      (turn, i) => cb(turn, i === this.turns.length - 1));
  }

  /* istanbul ignore next */
  /**
   * Get the board square at [col][row]
   * @return {Square} at col,row
   */
  at(col, row) {
    // Only used client-side
    return this.board.at(col, row);
  }

  /* istanbul ignore next */
  /**
   * Debug
   */
  stringify() {
    const options = [ `edition:${this.edition}` ];
    if (this.dictionary)
      options.push(`dictionary:${this.dictionary}`);
    if (this.timerType) {
      options.push(`${this.timerType}:${this.timeAllowed}`);
      if (this.timerType === Game.Timer.GAME)
        options.push(`timePenalty:${this.timePenalty}`);
    }
    if (this.challengePenalty) {
      options.push(this.challengePenalty);
      if (this.challengePenalty === Game.Penalty.PER_TURN
          || this.challengePenalty === Game.Penalty.PER_WORD)
        options.push(`lose:${this.penaltyPoints}`);
    }
    if (this.whosTurnKey)
      options.push(`next:${this.whosTurnKey}`);

    if (this.wordCheck) options.push(this.wordCheck);
    if (this.challengePenalty) options.push(this.challengePenalty);
    if (this.predictScore) options.push("Predict");
    if (this.allowTakeBack) options.push("Allow takeback");
    if (this.minPlayers)
      options.push(`>=${this.minPlayers}`);
    const ps = this.players.map(p => p.stringify()).join(",");
    options.push(`players:[${ps}]`);
    if (this.maxPlayers)
      options.push(`<=${this.maxPlayers}`);
    if (this.nextGameKey)
      options.push(`Next game ${this.nextGameKey}`);
    if (this.pausedBy)
      options.push(`Paused by ${this.pausedBy}`);
    return `Game ${this.key} {${options.join(", ")}}`;
  }

  /**
   * Determine if any players are robots.
   * @return the first robot found.
   */
  hasRobot() {
    return this.players.find(p => p.isRobot);
  }

  /**
   * Create a simple structure describing a subset of the game
   * state, for sending to the 'games' interface using JSON.  The
   * structure does not suffice to fully reconstruct the game; there
   * will be no `board`, `rackSize`, `swapSize`, `bonuses`, `turns`
   * will be a list of {@linkcode Turn#serialisable|Turn.serialisable},
   * and `players` will be a list of
   * {@linkcode Player#serialisable|Player.serialisable}.
   * @param {UserManager} um user manager object for getting emails; only
   * works on server side
   * @return {Promise} resolving to a simple object with
   * key game data
   */
  serialisable(um) {
    return Promise.all(
      this.players.map(player => player.serialisable(this, um)))
    .then(ps => {
      const simple = {
        key: this.key,
        creationTimestamp: this.creationTimestamp,
        edition: this.edition,
        dictionary: this.dictionary,
        state: this.state,
        allowUndo: this.allowUndo,
        // players is a list of Player.serialisable
        players: ps,
        whosTurnKey: this.whosTurnKey,
        timerType: this.timerType,
        challengePenalty: this.challengePenalty,
        lastActivity: this.lastActivity(), // epoch ms
        // this.board is not sent
        // this.rackSize not sent
        // this.swapSize not sent
        // this.bonuses not sent
        // turns is a list of Turn.serialisable
        turns: this.turns.map(t => t.serialisable())
      };
      if (this.minPlayers) simple.minPlayers = this.minPlayers;
      if (this.maxPlayers) simple.maxPlayers = this.maxPlayers;
      if (this.wordCheck) simple.wordCheck = this.wordCheck;
      if (this.timerType != Game.TIMER_NONE) {
        simple.timeAllowed = this.timeAllowed;
        simple.timePenalty = this.timePenalty;
      }
      if (this.challengePenalty === Game.Penalty.PER_TURN
          || this.challengePenalty === Game.Penalty.PER_WORD)
        simple.penaltyPoints = this.penaltyPoints;
      if (this.nextGameKey) simple.nextGameKey = this.nextGameKey;
      if (this.pausedBy) simple.pausedBy = this.pausedBy;
      if (this.predictScore) simple.predictScore = true;
      if (this.allowTakeBack) simple.allowTakeBack = true;

      return simple;
    });
  }

  /**
   * Promise to finish the construction or load from serialisation
   * of a game.
   * A game has to know what DB so it knows where to save. The
   * database and connections are not serialised, and must be
   * reset when loading.
   * @param {Database} db the db to use to store games
   * @return {Promise} Promise that resolves to the game
   */
  onLoad(db) {
    // if this onLoad follows a load from serialisation, which
    // does not invoke the constructor.
    // We always set the _db

    /**
     * Database containing this game. Only available server-side,
     * and not serialised.
     * @member {Database}
     * @private
     */
    this._db = db;

    if (!this._channels)
      this._channels = [];

    // Compatibility; timeLimit in s to timeAllowed in minutes
    if (this.timeLimit && !this.timeAllowed)
      this.timeAllowed = this.timeLimit / 60;

    if (!this._debug) {
      this._debug = () => {};
      this.players.forEach(p => p._debug = this._debug);
    }

    return Promise.resolve(this);
  }

  /**
   * Load a game from a structure generated by serialisable. This
   * method is designed to use to support rapid loading of games
   * into the `games` browser interface. The game will be incomplete,
   * only the fields supported by serialisable will be populated.
   * @param {object} factory Game class to be used as factory
   * @param {object} simple object generated by serialisable()
   */
  static fromSerialisable(simple, factory) {
    const game = new factory.Game(simple);
    game.state = simple.state;
    game.players = simple.players.map(
      p => factory.Player.fromSerialisable(p, factory));
    game.turns = simple.turns.map(t => Turn.fromSerialisable(t, factory));
    return game;
  }

  // Shortcuts for moving tiles around within the game

  /**
   * Shorthand to remove tiles from the board and put
   * them on a rack
   * @param {Tile[]} tiles list of tile placements
   * @param {Player} player player whose rack we are adjusting
   */
  boardToRack(tiles, player) {
    for (const placement of tiles) {
      const square = this.at(placement.col, placement.row);
      const tile = square.unplaceTile();
      assert(tile, `No tile at ${stringify(placement)}`);
      player.rack.addTile(tile);
    }
  }

  /**
   * Shorthand to move tiles from the rack to the board
   * at the locations dictated in a set of placements
   * @param {Tile[]} tiles list of tile placements
   * @param {Player} player player whose rack we are adjusting
   * @param {function?} cb optional callback on each tile that was placed
   */
  rackToBoard(tiles, player, cb) {
    for (const place of tiles) {
      const tile = player.rack.removeTile(place);
      assert(
        tile, `Tile ${stringify(place)} not found on rack`);
      const square = this.at(place.col, place.row);
      square.placeTile(tile, true);
      if (cb)
        cb(tile);
    }
  }

  /**
   * Shorthand method to take tiles out of the letter bag and put
   * them on a rack
   * @param {Tile[]} tiles list of tiles
   * @param {Player} player player whose rack we are adjusting
   */
  bagToRack(tiles, player) {
    for (const tile of tiles) {
      const removed = this.letterBag.removeTile(tile);
      assert(removed, `${stringify(tile)} missing from bag`);
      player.rack.addTile(removed);
    }
  }

  /**
   * Shorthand method to move a set of tiles from a rack to the bag
   * @param {Tile[]} tiles list of tiles
   * @param {Player} player player whose rack we are adjusting
   */
  rackToBag(tiles, player) {
    for (const tile of tiles) {
      const removed = player.rack.removeTile(tile);
      assert(removed, `${stringify(tile)} missing from rack`);
      this.letterBag.returnTile(removed);
    }
  }

  /**
   * Start, or continue, playing the game if preconditions are met.
   * @return {Promise} promise that resolves to the game
   */
  playIfReady() {
    /* istanbul ignore if */
    if (this._debug)
      this._debug("playIfReady ", this.key,
                  this.whosTurnKey ? `player ${this.whosTurnKey}` : "",
                  "state", this.state);

    if (this.hasEnded()) {
      /* istanbul ignore if */
      if (this._debug)
        this._debug("\tgame is over");
      return Promise.resolve(this);
    }

    // Check preconditions for starting the game
    if (this.players.length < (this.minPlayers || 2)) {
      /* istanbul ignore if */
      if (this._debug)
        this._debug("\tnot enough players");
      // Result is not used
      return Promise.resolve(this);
    }

    // If no turn has been allocated yet,
    // shuffle the players, and pick a random tile from the bag.
    // The shuffle can be suppressed for unit testing.
    if (this.state === Game.State.WAITING) {
      /* istanbul ignore if */
      if (this._debug)
        this._debug("\tpreconditions met");

      if (this.players.length > 1 && !this._noPlayerShuffle) {
        /* istanbul ignore if */
        if (this._debug)
          this._debug("\tshuffling player order");
        for (let i = this.players.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          // i = 1, j = 0,1
          //    j = 0, swap 0 and 1
          //    j = 1, leave 1 in place
          const temp = this.players[i];
          this.players[i] = this.players[j];
          this.players[j] = temp;
        }
        // Notify all connections of the order change
        // (asynchronously)
        this.sendCONNECTIONS();
      }

      const player = this.players[0];
      this.whosTurnKey = player.key; // assign before save()
      /* istanbul ignore if */
      if (this._debug)
        this._debug("\t", player.key, "to play");
      this.state = Game.State.PLAYING;

      return this.save()
      // startTurn will autoplay if the first player is
      // a robot. It will also start the clock.
      .then(() => this.startTurn(player));
    }

    const nextPlayer = this.getPlayer();
    if (nextPlayer) {
      if (nextPlayer.isRobot)
        return this.startTurn(nextPlayer);

      /* istanbul ignore if */
      if (this._debug)
        this._debug("\twaiting for", nextPlayer.name, "to play");
      this.startTheClock();
    }
    return Promise.resolve(this);
  }

  /**
   * TODO: move to BackendGame
   * Wrap up after a command handler that is returning a Turn.
   * Log the command, determine whether the game has ended,
   * save state and notify connected players with the Turn object.
   * @param {Player} player player who's turn it was
   * @param {object} turn fields to populate the Turn to finish
   * @return {Promise} that resolves to the game
   */
  finishTurn(player, turn) {
    turn = new Turn(turn);
    turn.gameKey = this.key;
    turn.playerKey = player.key;

    // store turn (server side)
    this.pushTurn(turn);

    let redacted = turn;

    // Censor replacements for all but the player who's play it was
    if (!this.allowUndo && !this.syncRacks && turn.replacements) {
      redacted = new Turn(turn);
      redacted.replacements = [];
      for (const tile of turn.replacements) {
        const rt = new Tile(tile);
        rt.letter = '#';
        redacted.replacements.push(rt);
      }
    }

    return this.save()
    .then(() => Promise.all([
      this.notifyPlayer(player, Game.Notify.TURN, turn),
      this.notifyOthers(player, Game.Notify.TURN, redacted)
    ]))
    .then(() => this);
  }

  /**
   * If the game has a time limit, start an interval timer.
   * @return {boolean} true if the clock is started, false otherwise
   * (e.g. if it is already running)
   * @private
   */
  startTheClock() {
    if (typeof this._intervalTimer === "undefined"
        && this.timerType
        && this.state === Game.State.PLAYING) {

      // Broadcast a ping every second
      /**
       * Timer object for ticking.
       * @member {object?}
       * @private
       */
      this._intervalTimer = setInterval(() => this.tick(), 1000);
      /* istanbul ignore if */
      if (this._debug)
        this._debug(this.key, "started the clock");
      return true;
    }
    return false;
  }

  /**
   * Stop the interval timer, if there is one
   * @return {boolean} true if the clock is stopped, false otherwise
   * @private
   */
  stopTheClock() {
    if (typeof this._intervalTimer == "undefined")
      return false;
    /* istanbul ignore if */
    if (this._debug)
      this._debug(this.key, "stopped the clock");
    clearInterval(this._intervalTimer);
    delete(this._intervalTimer);
    return true;
  }

  /**
   * Tell all clients a tick has happened (or
   * remind them of the current number of seconds to play)
   * @private
   */
  tick() {
    const player = this.getPlayer();
    if (!player)
      return;

    player.tick();

    // Really should save(), otherwise the ticks won't
    // survive a server restart. However it's expensive, and server
    // restarts are rare, so let's not.
    this.notifyAll(
      Game.Notify.TICK,
      {
        gameKey: this.key,
        playerKey: player.key,
        clock: player.clock,
        timestamp: Date.now()
      });
  }

  /**
   * Start (or restart) the turn of the given player.
   * @param {Player?} player the the player to get the turn.
   * @param {number?} timeout Only relevant when `timerType` is
   * `Game.Timer.TURN`. Turn timeout for this turn. Set if
   * this is a restart of an unfinished turn, defaults to
   * this.timeAllowed if undefined.
   * @return {Promise} a promise that resolves to undefined
   * @private
   */
  startTurn(player, timeout) {
    assert(player, "No player");

    if (!this.players.find(p => p.passes < 2))
      return this.confirmGameOver(player, Game.State.TWO_PASSES);

    /* istanbul ignore if */
    if (this._debug)
      this._debug("startTurn", player.name, player.key);

    this.whosTurnKey = player.key;

    if (player.isRobot) {
      // May recurse if the player after is also a robot, but
      // the recursion will always stop when a human player
      // is reached, so never deep.
      return this.autoplay();
    }

    // For a timed game, make sure the clock is running and
    // start the player's timer.

    if (this.timerType) {
      /* istanbul ignore if */
      if (this._debug)
        this._debug("\ttimed game,", player.name,
                    "has", (timeout || this.timeAllowed),
                    "left to play",this.timerType);
      this.startTheClock(); // does nothing if already started
    }
    else {
      /* istanbul ignore if */
      if (this._debug)
        this._debug("\tuntimed game, wait for", player.name, "to play");
      return Promise.resolve(this);
    }

    if (this.timerType === Game.Timer.TURN)
      // Make the player pass when their clock reaches 0
      player.setTimeout(
        timeout || this.timeAllowed * 60,
        () => this.pass(player, Game.Turns.TIMED_OUT));

    return Promise.resolve(this);
  }

  /**
   * Robot play for the current player. This may result in a challenge.
   * @return {Promise} resolving to this
   */
  autoplay() {
    const player = this.getPlayer();
    /* istanbul ignore if */
    if (this._debug)
      this._debug("Autoplaying", player.name,
                  "using", player.dictionary || this.dictionary);

    let pre = ((player.delayBeforePlay || 0) > 0)
        ? new Promise(
          resolve => setTimeout(resolve, player.delayBeforePlay * 500))
        : Promise.resolve();
    let mid = ((player.delayBeforePlay || 0) > 0)
        ? new Promise(
          resolve => setTimeout(resolve, player.delayBeforePlay * 500))
        : Promise.resolve();
    // Before making a robot move, consider challenging the last
    // player.
    // challenge is a Promise that will resolve to true if a
    // challenge is made, or false otherwise.
    let lastPlay = this.lastTurn();
    if (lastPlay && lastPlay.type === Game.Turns.PLAYED
        && this.dictionary
        && player.canChallenge) {
      const lastPlayer = this.getPlayerWithKey(lastPlay.playerKey);
      // There's no point if they are also a robot, though
      // that should never arise in a "real" game where there can
      // only be one robot.
      if (!lastPlayer.isRobot) {
        // use game dictionary, not robot dictionary
        pre = pre.then(() => this.getDictionary())
        .then(dict => {
          const bad = lastPlay.words
                .filter(word => !dict.hasWord(word.word));
          if (bad.length > 0) {
            // Challenge succeeded
            /* istanbul ignore if */
            if (this._debug)
              this._debug("Challenging", lastPlayer.name);
            /* istanbul ignore if */
            if (this._debug)
              this._debug("Bad words:", bad);
            return this.takeBack(player, Game.Turns.CHALLENGE_WON)
            .then(() => true);
          }
          return false; // no challenge made
        });
      }
    }

    return pre
    .then(challenged => {
      if (!challenged && lastPlay) {
        // Last play was good, check the last player has tiles
        // otherwise the game is over
        const lastPlayer = this.getPlayerWithKey(lastPlay.playerKey);
        if (lastPlayer.rack.isEmpty())
          return this.confirmGameOver(player, Game.State.GAME_OVER);
      }

      // We can play.
      let bestPlay = null;
      return Platform.findBestPlay(
        this, player.rack.tiles(),
        data => {
          if (typeof data === "string") {
            /* istanbul ignore if */
            if (this._debug)
              this._debug(data);
          } else {
            bestPlay = data;
            /* istanbul ignore if */
            if (this._debug)
              this._debug("Best", bestPlay.stringify());
          }
        }, player.dictionary || this.dictionary)
      .then(() => {
        if (bestPlay)
          return mid.then(() => this.play(player, bestPlay));

        /* istanbul ignore if */
        if (this._debug)
          this._debug(player.name, "can't play, passing");
        return this.pass(player, Game.Turns.PASSED);
      });
    });
  }

  /**
   * Get the dictionary for this game, lazy-loading as necessary
   * @return {Promise} promise resolves to a {@linkcode Dictionary}
   */
  getDictionary() {
    /* istanbul ignore next */
    assert(this.dictionary, "Game has no dictionary");
    return loadDictionary(this.dictionary);
  }

  /**
   * Perform a save to the connected database (set in onLoad).
   * @return {Promise} promise resolves to this
   */
  save() {
    assert(this._db, "No _db for save()");
    /* istanbul ignore if */
    if (this._debug)
      this._debug("Saving game", this.key);
    return this._db.set(this.key, Game.toCBOR(this))
    .then(() => this);
  }

  /**
   * Send a notification to just one player, if they are connected
   * through a channel. Note that the player
   * may be connected multiple times through different channels.
   * @param {Player} player player to send to
   * @param {string} message to send
   * @param {Object} data to send with message.
   */
  notifyPlayer(player, message, data) {
    /* istanbul ignore if */
    if (this._debug)
      this._debug("b>f", player.key, message,
                stringify(data));
    // Player may be connected several times, or not at all
    this._channels.forEach(
      channel => {
        if (channel.player && channel.player.key === player.key)
          channel.emit(message, data);
        return false;
      });
  }

  /**
   * Broadcast a notification to all game observers. Note
   * that an observer may be connected multiple times,
   * through different channels, or not at all.
   * @param {string} message to send
   * @param {Object} data to send with message
   */
  notifyAll(message, data) {
    if (message !== Game.Notify.TICK)
      /* istanbul ignore if */
      if (this._debug)
        this._debug("b>f *", message, stringify(data));
    this._channels.forEach(channel => channel.emit(message, data));
  }

  /**
   * Broadcast a notification to all observers except the
   * given player.
   * @param {Player} player player to exclude
   * @param {string} message to send
   * @param {Object} data to send with message
   */
  notifyOthers(player, message, data) {
    /* istanbul ignore if */
    if (this._debug)
      this._debug("b>f !", player.key, message, stringify(data));
    this._channels.forEach(
      channel => {
        // Player may be connected several times, so check key and not object
        if (channel.player && channel.player.key !== player.key)
          channel.emit(message, data);
        return false;
      });
  }

  /**
   * Does player have an active connection to this game?
   * @param {Player} player the player
   * @return {Channel?} the connection channel, if connected.
   */
  getConnection(player) {
    // TODO: move this to backend
    if (player) {
      for (const channel of this._channels) {
        if (channel.player && channel.player === player) {
          player._isConnected = true;
          return channel;
        }
      }
      player._isConnected = false;
    }
    return undefined;
  }

  /**
   * Notify players with a list of the currently connected
   * players, non-playing observers and non-connected players.
   */
  sendCONNECTIONS() {
    Promise.all(
      this.players
      .map(player => player.serialisable(this)
           .then(cat => {
             cat.gameKey = this.key;
             if (cat.key === this.whosTurnKey)
               cat.isNextToGo = true;
             return cat;
           })))
    .then(res => {
      // Add observers who are not active players. These track
      // game state without participating, though at some point
      // we may add referreing functions.
      res = res.concat(
        this._channels
        .filter(channel => !channel.player)
        .map(() => {
          return {
            isObserver: true
          };
        }));
      this.notifyAll(Game.Notify.CONNECTIONS, res);
    });
  }

  /**
   * Connect to a player front end via the given notification channel.
   * Play the game if preconditions have been met.
   * @param {Channel} channel the channel that will be
   * used to send notifications to the front end for the given
   * player.
   * @param {string} playerKey the key identifying the player
   * @return {Promise} promise that resolves to undefined
   */
  connect(channel, playerKey) {

    // Make sure this is a valid (known) player
    const player = this.players.find(p => p.key === playerKey);
    /* istanbul ignore if */
    if (playerKey && !player)
      console.error("WARNING: player key", playerKey,
                    "not found in game", this.key);

    /* istanbul ignore if */
    if (this.getConnection(player)) {
      console.error("WARNING:", playerKey, "already connected to",
                    this.key);
      player._isConnected = true;
    } else if (player) {
      // This player is just connecting
      /* istanbul ignore if */
      if (this._debug)
        this._debug("\t", player.name, "connected to", this.key);
      player._isConnected = true;
    } else {
      /* istanbul ignore if */
      if (this._debug)
        this._debug("\tconnected non-player");
    }

    // Player is connected. Decorate the channel. It may seem
    // rather cavalier writing over what might be a socket this
    // way, but it does simplify the code quite a bit.
    channel.game = this;
    channel.player = player;

    if (!this._channels)
      this._channels = [];
    this._channels.push(channel);

    // Tell players that the player is connected
    this.sendCONNECTIONS();

    // Add disconnect listener
    /* istanbul ignore next */
    channel.on("disconnect", () => {
      if (channel.player) {
        channel.player._isConnected = false;
        /* istanbul ignore if */
        if (this._debug)
          this._debug(channel.player.name, "disconnected");
      } else {
        /* istanbul ignore if */
        if (this._debug)
          this._debug("non-player disconnected");
      }
      this._channels.splice(this._channels.indexOf(channel), 1);
      this.sendCONNECTIONS();
    });

    return this.playIfReady();
  }

  /**
   * Encode the data using CBOR and the Game type map.
   * @param {object} data data to encode
   * @param {function?} debug debug function passed to cbor encoder, same
   * sig as console.debug.
   */
  static toCBOR(data, debug) {
    // Debug function to find where a missing key is coming from
    /*function sniffOut(data, what, path) {
      if (typeof data === "object") {
        if (Array.isArray(data)) {
          for (const e of data)
            sniffOut(e, what, `${path}[]`);
        } else {
          if (!data._sniffed) {
            data._sniffed = true;
            if (typeof data[what] !== "undefined") {
              console.log("SNIFFED OUT", data);
              throw Error(path);
            }
            for (const k in data)
              sniffOut(data[k], what, `${path}.${k}`);
          }
        }
      }
    }
    sniffOut(data, "babefacebabeface", "");*/
    CBOR_tagHandler.typeMap = Game.CLASSES;
    return Encoder.encode(data, CBOR_tagHandler, debug);
  }

  /**
   * Decode the data using CBOR and the given type map.
   * @param {ArrayBuffer|TypedArray|DataView} cbor data to decode
   * @param {object.{string,object>} map from prototype name to prototype
   * @param {function?} debug debug function passed to cbor decoder, same
   * sig as console.debug.
   */
  static fromCBOR(cbor, typeMap, debug) {
    CBOR_tagHandler.typeMap = typeMap;
    try {
      return Decoder.decode(cbor, CBOR_tagHandler, debug);
    } catch (e) {
      // Maybe Fridge? Old format.
      if (debug)
        debug("CBOR error decoding:\n", e.message);

      // Compatibility; try using Fridge, versions of FileDatabase
      // prior to 3.1.0 used it.
      try {
        return Fridge.thaw(cbor.toString(), typeMap);
      } catch (e) {
        throw Error(`Thawing error: ${e}`);
      }
    }
  }

  /**
   * Used for testing only.
   * @param sboard string representation of a game {@linkcode Board}
   * @return {Promise} resolving to `this`
   */
  loadBoard(sboard) {
    return this.getEdition()
    .then(ed => this.board.parse(this.constructor.CLASSES, ed, sboard))
    .then(() => this);
  }


}

export { Game }
