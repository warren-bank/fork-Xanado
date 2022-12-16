const requirejs = require("requirejs");

requirejs.config({
  baseUrl: `${__dirname}/..`,
  nodeRequire: require,
  paths: {
    common: "js/common",
    game: "js/game",
    dawg: "js/dawg",
    server: "js/server",
    platform: "js/server/Platform"
  }
});

/**
 * Create a simple example game for the splash screen. The example is created
 * in the 'games' directory.
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
        "| | | | | | | | |D| | | | | | |\n" +
        "| | | | | | | | |I| | | | | | |\n" +
        "| | | | |S| | | |C| | | | | | |\n" +
        "| | | | |C| | | |T| | | | | | |\n" +
        "| | | | |R| | | |I| | | | |W| |\n" +
        "| | | |X|A|N|A|D|O| | | | |O| |\n" +
        "| | | | |B| | | |N| |F| | |R| |\n" +
        "| | | | |B| | | |A| |R| | |D| |\n" +
        "| | | | |L| | |F|R|I|E|N|D|S| |\n" +
        "| | | | |E| | | |I| |E| | | | |\n" +
        "| | | | | | | | |E| | | | | | |\n" +
        "| |L|E|X|U|L|O|U|S| | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n" +
        "| | | | | | | | | | | | | | | |\n");
      game.save()
      .then(() => console.log(`Saved ${game.key}.game`));
    });
  });
});

