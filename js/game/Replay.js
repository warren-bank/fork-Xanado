/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define([
  "platform", "common/Utils",
  "game/LetterBag", "game/Board", "game/Game",
  "game/Player", "game/Tile", "game/Rack", "game/Turn", "game/Undo"
], (
  Platform, Utils,
  LetterBag, Board, Game,
  Player, Tile, Rack, Turn, Undo
) => {

  /**
   * Extend Game to support replay of another game. Requires
   * {@linkcode game/Undo} and {@linkcode game/Commands}
   * to be mixed in.
   * @mixin game/Replay
   */
  return superclass => class Replay extends superclass {

    /*
     * Replay the turns in another game, to arrive at the same state.
     * The letter bag, players, and some other conditions
     * are copied from the other game, and each turn is undone
     * back to the game's initial state. Then each turn is replayed.
     * all players are played as human players - there is no move
     * computation done.
     * Usage
     * ```
     * let simulation = new Game(gameToPlay).replay(gameToPlay)
     * for (let i = 0; i < gameToPlay.turns.length)
     *    simulation.step();
     * ```
     * @param {Game} playedGame the game containing turns and players
     * to simulate.
     * @instance
     * @memberof game/!Replay
     */
    replay(playedGame) {
      this.playedGame = playedGame;
      this.allowUndo = true;
      // Reset to the first turn
      this.nextTurn = 0;
      // Override the bag and board (this is what create() would do)
      this.letterBag = new LetterBag(this.playedGame.letterBag);
      this.board = new Board(Game.CLASSES, this.playedGame.board);
      this.bonuses = this.playedGame.bonuses;
      this.rackSize = this.playedGame.rackCount;
      this.swapSize = this.playedGame.swapCount;
      this.state = Game.State.PLAYING;
      this.whosTurnKey = this.playedGame.turns[0].playerKey;

      // Copy players and their racks.
      for (const p of this.playedGame.players) {
        const np = new Player(p, Game.CLASSES);
        np.isRobot = false;
        np.rack = new Rack(Game.CLASSES, p.rack);
        np.passes = p.passes;
        np.score = p.score;
        this.addPlayer(np);
        this._debug("\tlast rack for", np.key, "was", np.rack.stringify());
      }

      // Copy the board
      this.playedGame.board.forEachTiledSquare(
        (square, c, r) => {
          this.board.at(c, r).tile = new Tile(square.tile);
          return false;
        });

      // Remember the initial bag tiles
      const preUndoBag = new LetterBag(this.playedGame.letterBag).tiles;

      // To get back to the initial game state we have to run through
      // the turn history backwards to reconstruct initial racks.
      // Could use Undo to do this, but it's overkill as we don't need
      // (or want) to modify the board
      const turns = this.playedGame.turns;
      this._debug("unwrap", turns.length, "turns");
      for (let i = this.playedGame.turns.length - 1; i >= 0; i--) {
        const turn = this.playedGame.turns[i];
        this.undo(turn, true);
        /*const tiles = this.letterBag.letters();
        this._debug(
          `Bag  "${this.letterBag.letters().sort().join("")}"`);
        const ts =
              this.board.tiles().map(bt => bt.isBlank ? " " : bt.letter);
        this._debug(`Board"${ts.sort().join("")}"`);
        tiles.push(ts);
        for (const p of this.players) {
          tiles.push(p.rack.letters());
          this._debug(`Rack "${p.rack.letters().sort().join("")}"`);
        }
        this._debug(`All  "${tiles.flat().sort().join("")}"`);*/
      }

      for (const pl of this.players) {
        pl.missNextTurn = false;
        this._debug("Start player", pl.stringify());
      }
      this._debug("Start bag", this.letterBag.stringify());
      this._debug("--------------------------------");

      return this;
    }

    /**
     * Promise to perform a single step in the simulation
     * @instance
     * @memberof game/Replay
     * @return {Promise} promise that resolves to the simulated turn when
     * the simulation step has been run
     */
    step() {
      // Copy the turn to avoid accidental overwrite
      const turn = new Turn(this.playedGame.turns[this.nextTurn++]);
      turn.gameKey = this.key;
      return this.redo(turn) // redo comes from Undo.js
      .then(() => {
        for (const pl of this.players)
          this._debug(pl.stringify());
        this._debug("---------------------");
        return turn;
      });
    }
  };
});
