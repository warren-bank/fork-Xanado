const requirejs = require("requirejs");

requirejs.config({
  baseUrl: `${__dirname}/..`,
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

/**
 * Create a simple example game for the splash screen
 */
requirejs([
  "game/Edition", "game/Game", "game/Player", "server/FileDatabase"
], (
  Edition, Game, Player, FileDatabase
) => {

  const db = new FileDatabase({
    dir: "games",
    ext: "game",
    typeMap: Game
  });
  Edition.load("English_Scrabble")
  .then(edition => {
    new Game({key:"example", edition: edition.name, debug: console.debug})
    .create()
    .then(game => game.onLoad(db))
    .then(game => {
      game.board.parse(
        Game, edition,
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | |D| | | | | | |\n" +
        "| | | | | | | | |I| | | | | | |\n" +
        "| | | | |S| | | |C|U|S|T|O|M| |\n" +
        "| | | | |C| | | |T| | | | | | |\n" +
        "| | | | |R| | | |I| | | | |W| |\n" +
        "| | | |X|A|N|A|D|O| | | | |O| |\n" +
        "| | | | |B| | | |N| |F| | |R| |\n" +
        "| | | | |B| | | |A| |R| | |D| |\n" +
        "| | | | |L| | |F|R|I|E|N|D|S| |\n" +
        "| | | | |E| | | |I| |E| | | | |\n" +
        "| | | | | | | | |E| | | | | | |\n" +
        "| |L|E|X|U|L|O|U|S| | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n");
      game.save()
      .then(() => console.log(`Saved ${game.key}.game`));
    });
  });
});

