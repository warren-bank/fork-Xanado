/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env node */

/**
 * This is NOT a unit test, it is a stand-alone test for the game engine.
 * It will play a complete game between two robot players. It does not test
 * the server.
 */
requirejs = require("requirejs");

requirejs.config({
  baseUrl: "..",
  nodeRequire: require,
  paths: {
    cbor: "node_modules/@cdot/cbor/dist/index",
    dictionary: "node_modules/@cdot/dictionary/dist/index",
    common: "js/common",
    game: "js/game",
    server: "js/server",
    platform: "js/server/Platform"
  }
});

requirejs([
  "js/game/Edition", "js/game/Tile", "js/game/Rack",
  "js/game/Square", "js/game/Player", "js/game/Game", "js/game/LetterBag",
  "js/game/Board", "js/game/Move",
  "js/test/MemoryDatabase"
], (
  Edition, Tile, Rack,
  Square, Player, Game, LetterBag,
  Board, Move, MemoryDatabase
) => {

  let db = new MemoryDatabase();
  let game = new Game({
    //_debug: console.debug,
    edition: "Test",
    dictionary: "CSW2019_English"
  });
  let gameKey = game.key;
  let player = 0;
  game.create()
  .then(() => game.onLoad(new MemoryDatabase()))
  .then(game => {
    let player1 = new Player({
      name: "player one", key: "flay", isRobot: true}, Game.CLASSES);
    game.addPlayer(player1, true);
    let player2 = new Player({name: "player two", key: "swelter",
                              isRobot: true }, Game.CLASSES);
    game.addPlayer(player2, true);
    game.whosTurnKey = player1.key;
    return game.onLoad(db);
  })
  .then(game => game.save())
  .then(async game => {
    let finished = false;
    while (!finished) {
      await db.get(gameKey)
      .then(d => Game.fromCBOR(d, Game.CLASSES))
      .then(game => game.onLoad(db))
      .then(game => {
        return game.autoplay()
        .then(turn => {
          if (game.hasEnded()) {
            console.log(game.state);
            finished = true;
          }
          return game.save();
        });
      });
    }
    console.log("Robot game over");
  });
});

