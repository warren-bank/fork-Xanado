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

requirejs([
  "game/Edition", "game/Game", "game/Player", "server/FileDatabase"
], (
  Edition, Game, Player, FileDatabase
) => {

  const db = new FileDatabase("test/temp", "game");
  Edition.load("English_Scrabble")
  .then(edition => {
    return new Game({edition: edition.name, dictionary: "Oxford_5000"})
    .create();
  })
  .then(game => game.onLoad(db))
  .then(game => {
    game.addPlayer(new Player({name:"Player", key: "shuggie"}), true);
    return game.loadBoard("| | | | | | | | | | | | | | |\n" +
                          "|W|O|R|D|S| | | | |C| | | | |\n" +
                          "|I| | | |C| | | | |U| | | | |\n" +
                          "|T| | |F|R|I|E|N|D|S| | | | |\n" +
                          "|H| | | |A| | | | |T| | | | |\n" +
                          "| | | | |B| | | |B|O|A|R|D| |\n" +
                          "| | | | |B| | | | |M| | |I| |\n" +
                          "|L|E|X|U|L|O|U|S| | | | |C| |\n" +
                          "| | |A| |E| | | | | | | |T| |\n" +
                          "| | |N| | | | | | | | | |I| |\n" +
                          "| | |A| | | | | | | | | | | |\n" +
                          "| | |D| | | | | | | | | |N| |\n" +
                          "| | |O| | | | | | | | | |A| |\n" +
                          "| | | | | | | |S|E|R|V|E|R| |\n" +
                          "| | | | | | | | | | | | |Y| |\n");
  })
  .then(game => game.save())
  .then(game => console.log(`Saved test/temp/${game.key}.game`));
});

