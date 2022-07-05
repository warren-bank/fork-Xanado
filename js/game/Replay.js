/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define("game/Replay", [
	"platform", "common/Utils",
	"game/Types", "game/LetterBag",
  "game/Player", "game/Tile", "game/Rack", "game/Turn",
  "game/Game", "game/Undo"
], (
	Platform, Utils,
	Types, LetterBag,
  Player, Tile, Rack, Turn,
  Game, Undo
) => {

  const Turns = Types.Turns;
  const State = Types.State;

  // Remove randomness from the letterbag
  class SimBag extends LetterBag {
    constructor(edition, bag) {
      super(edition);
      this.tiles = [];
      for (const tile of bag.tiles)
        this.tiles.push(new Tile(tile));
    }
    shake() {};
  }

  /**
   * Extend Game to support replay of another game
   * @extends Game
   */
  class Replay extends Game {

    /*
     * Copy another game and play the turns in that game, to arrive
     * at the same state.
     * The letter bag, players, and some other initial conditions
     * are copied from the other game. All players are played as
     * human players - there is no move computation done.
     * @param {Game} playedGame the game containing turns and players
     * to simulate.
     */
    constructor(playedGame) {
      super(playedGame);
      this.playedGame = playedGame;
      this.state = State.PLAYING;
      this.nextTurn = 0;
    }

    /**
     * @override
     */
    create() {
      return super.create()
      .then(() => this.getEdition())
      .then(edition => {
        this.letterBag = new SimBag(edition, this.playedGame.letterBag);
        this.state = State.PLAYING;
        this.whosTurnKey = this.playedGame.turns[0].playerKey;
        // Copy players and their racks.
		    for (const p of this.playedGame.players) {
          const np = new Player(p);
          np.isRobot = false;
          np.rack = new Rack(p.rack);
          np.passes = 0;
          np.score = 0;
          this.addPlayer(np);
          this._debug("\tfinal rack for", np.key, np.rack.toString());
        };

        // Remember the initial bag tiles
        const preUndoBag = new LetterBag(edition).tiles;

        // To get back to the initial game state we have to run through
        // the turn history backwards to reconstruct initial racks.
        // Could use Undo to do this, but it's overkill as we don't need
        // (or want) to modify the board
        const turns = this.playedGame.turns;
        const undoer = new Undo(this);
        for (let i = turns.length - 1; i >= 0; i--) {
          const turn = turns[i];
          this._debug("\tundo",turn.toString());
          const player = this.getPlayerWithKey(turn.playerKey);
          if (turn.type === Turns.TOOK_BACK
              || turn.type === Turns.CHALLENGE_WON) {
            undoer.unrack(turn.placements, player);
            undoer.bag2rack(turn.replacements, player);
          } else {
            let racked;
            if (turn.replacements)
              racked = undoer.unrack(turn.replacements, player);
            if (turn.placements)
              undoer.rerack(turn.placements, player);
            if (racked)
              undoer.rebag(racked);
          }
        }
        this.undoer = undoer;

        this.letterBag.tiles = preUndoBag;
        for (const pl of this.players) {
          for (const tile of pl.rack.tiles())
            this.letterBag.removeTile(tile);
          this._debug("\tstart rack for", pl.key, pl.rack.toString());
        }

        this._debug("\tstart bag", this.letterBag.toString());
        return this;
      });
    }

    /**
     * Promise to perform a single step in the simulation
     * @return {Promise} promise that resolves when the simulation step
     * has been run
     */
    step() {
      const turn = new Turn(this, this.playedGame.turns[this.nextTurn++]);
      const player = this.getPlayerWithKey(turn.playerKey);
      if (turn.type !== Turns.TAKE_BACK
          && turn.type !== Turns.CHALLENGE_WON) {
      }
      switch (turn.type) {
		  case Turns.SWAPPED:
        this.undoer.unbag(turn.replacements);
        this.letterBag.returnTiles(turn.replacements);
        return this.swap(player, turn.placements);
		  case Turns.PLAYED:
        this.undoer.unbag(turn.replacements);
        this.letterBag.returnTiles(turn.replacements);
        return this.play(player, turn);
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
      return Platform.assert(false, `Unrecognised turn type ${turn.type}`);
	  }
  }

  return Replay;
});
