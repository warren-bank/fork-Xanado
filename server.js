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

const requirejs = require("requirejs");

requirejs.config({
	baseUrl: __dirname,
    nodeRequire: require,
	paths: {
		jquery: "node_modules/jquery/dist/jquery",
		"jquery-i18n": "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n",

		common: "js/common",
		server: "js/server",
		game: "js/game",
		dawg: "js/dawg",

		platform: "js/server/ServerPlatform"
	}
});

requirejs([
	"server/Server",
	"node-getopt", "fs", "socket.io", "http", "https", "nodemailer"
], (
	Server,
	Getopt, fs, socket_io, Http, Https, NodeMailer
) => {

	const Fs = fs.promises;

	// Command-line arguments
	const cliopt = Getopt.create([
		["h", "help", "Show this help"],
		["S", "debug_server", "output cserver debug messages"],
		["G", "debug_game", "output game logic messages"],
		["c", "config=ARG", "Path to config file (default config.json)"]
	])
		  .bindHelp()
		  .setHelp("Xanado server\n[[OPTIONS]]")
		  .parseSystem()
		  .options;

	// Load config.json
	Fs.readFile(cliopt.config || "config.json")
	.then(json => JSON.parse(json))

	// Configure email
	.then(config => {

		if (cliopt.debug_server)
			config.debug_server = true;
		if (cliopt.debug_game)
			config.debug_game = true;
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

			http.listen(config.port);

			const io = new socket_io.Server(http);
			io.sockets.on(
				"connection", socket => server.attachSocketHandlers(socket));
		});
	});
});

