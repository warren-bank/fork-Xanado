/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

/**
 * This is the requirejs configuration and top level invocation for the server
 * only. The actual code is in {@linkcode Server}. Note that paths are relative
 * to the root of the distribution (where this script lives).
 * @module
 */

if (!requirejs) requirejs = require("requirejs");

requirejs.config({
  baseUrl: __dirname,
  paths: {
    "node-getopt" : "node_modules/node-getopt/index",
    jquery: "node_modules/jquery/dist/jquery",
    "jquery-i18n": "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n",

    common: "js/common",
    server: "js/server",
    backend: "js/backend",
    game: "js/game",
    dawg: "js/dawg",

    platform: "js/server/Platform"
  }
});

requirejs([
  "node-getopt", "fs", "socket.io", "http", "https", "nodemailer",
  "server/Server",
], (
  Getopt, fs, socket_io, Http, Https, NodeMailer,
  Server
) => {

  const Fs = fs.promises;

  // Default configuration.
  const DEFAULT_CONFIG = {
    port: 9093,
    games: "games",
    defaults: {
	    edition: "English_Scrabble",
	    dictionary: "CSW2019_English",
	    notification: false,
	    theme: "default",
	    warnings: true,
	    cheers: true,
	    tile_click: true,
      one_window: false,
      turn_alert: true
    }
  };

  // Populate sparse config structure with defaults from DEFAULT_CONFIG
  function addDefaults(config, from) {
    for (const field in from) {
      if (typeof config[field] === "undefined")
        config[field] = from[field];
      else if (typeof from[field] === "object") {
        if (typeof config[field] !== "object")
          throw Error(typeof config[field]);
        addDefaults(config[field], from[field]);
      }
    }
    return config;
  }

  // Command-line arguments
  const cliopt = Getopt.create([
    ["h", "help", "Show this help"],
    ["S", "debug_server", "output server debug messages"],
    ["G", "debug_game", "output game logic messages"],
    ["c", "config=ARG", "Path to config file"]
  ])
        .bindHelp()
        .setHelp("Xanado server\n[[OPTIONS]]")
        .parseSystem()
        .options;

  if (!cliopt.config)
    cliopt.config = "config.json";

  Fs.readFile(cliopt.config)
  .then(json => addDefaults(JSON.parse(json), DEFAULT_CONFIG))
  .catch(e => {
    console.error(e);
    console.warn(`Using default configuration`);
    return DEFAULT_CONFIG;
  })

  .then(config => {

    if (cliopt.debug_server)
      config.debug_server = true;
    if (cliopt.debug_game)
      config.debug_game = true;
    if (config.debug_server)
      console.debug(config);
    if (config.mail) {
      let transport;
      if (config.mail.transport === "mailgun") {
        if (!process.env.MAILGUN_SMTP_SERVER)
          console.error("mailgun configuration requested, but MAILGUN_SMTP_SERVER not defined");
        else {
          if (!config.mail.sender)
            config.mail.sender = `wordgame@${process.env.MAILGUN_DOMAIN}`;
          transport = {
            host: process.env.MAILGUN_SMTP_SERVER,
            port: process.env.MAILGUN_SMTP_PORT,
            secure: false,
            auth: {
              user: process.env.MAILGUN_SMTP_LOGIN,
              pass: process.env.MAILGUN_SMTP_PASSWORD
            }
          };
        }
      } else
        // Might be SMTP, might be something else
        transport = config.mail.transport;
      
      if (transport)
        config.mail.transport = NodeMailer.createTransport(
          transport);
    }

    const promises = [];
    if (config.https) {
      promises.push(
        Fs.readFile(config.https.key)
        .then(k => { config.https.key = k; }));
      promises.push(
        Fs.readFile(config.https.cert)
        .then(c => { config.https.cert = c; }));
    }
    return Promise.all(promises)
    .then(() => new Server(config))
    .then(server => {
      const http = config.https
            ? Https.Server(config.https, server.express)
            : Http.Server(server.express);

      console.log(`Server starting on port ${config.port}`);
      http.listen(config.port);

      const io = new socket_io.Server(http);
      // Each time a player connects, the server will receive
      // a 'connection' event.
      io.sockets.on(
        "connection",
        socket => server.attachSocketHandlers(socket));
    });
  });
});
