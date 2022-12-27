/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, node */

define([
  "fs", "path", "events", "cookie", "cors", "express", "errorhandler",
  "platform",  "common/Fridge", "common/Utils",
  "server/UserManager", "server/FileDatabase",
  "common/Types",
  "game/Game", "game/Player", "game/Turn", "game/Edition"
], (
  fs, Path, Events, Cookie, cors, Express, ErrorHandler,
  Platform, Fridge, Utils,
  UserManager, FileDatabase,
  Types,
  Game, Player, Turn, Edition
) => {

  const Fs = fs.promises;
  const Command = Types.Command;
  const Notify = Types.Notify;
  const Turns = Types.Turns;

  /**
   * Web server for crossword game. Errors will result in an
   * appropriate status code:
   * * 404 - usually a file read error
   * * 500 internal server error e.g. an assert
   *
   * Routes supported:
   * * `GET /` - Get the HTML for the main interface (the "games" page)
   * * {@linkcode Server#GET_games|GET /games/:send}
   * * {@linkcode Server#GET_history|GET /history}
   * * {@linkcode Server#GET_locales|GET /locales}
   * * {@linkcode Server#GET_editions|GET /editions}
   * * {@linkcode Server#GET_dictionaries|GET /dictionaries}
   * * {@linkcode Server#GET_themes|GET /themes}
   * * {@linkcode Server#GET_theme|GET /theme/:css
   * * {@linkcode Server#GET_npm_dependency|GET /node_modules/*
   * * {@linkcode Server#GET_defaults|`GET /defaults`}
   * * {@linkcode Server#GET_game|GET /game/:gameKey}
   * * {@linkcode Server#POST_createGame|POST /createGame}
   * * {@linkcode Server#POST_invitePlayers|POST /invitePlayers/:gameKey}
   * * {@linkcode Server#POST_deleteGame|POST /deleteGame/:gameKey}
   * * {@linkcode Server#POST_anotherGame|POST /anotherGame/:gameKey}
   * * {@linkcode Server#POST_sendReminder|POST /sendReminder/:gameKey}
   * * {@linkcode Server#POST_join|POST /join/:gameKey}
   * * {@linkcode Server#POST_leave|POST /leave/:gameKey}
   * * {@linkcode Server#POST_addRobot|POST /addRobot/:gameKey}
   * * {@linkcode Server#POST_removeRobot|POST /removeRobot/:gameKey}
   *
   * See also {@link UserManager} for other user management routes.
   */
  class Server {

    /**
     * @param {Object} config See example-config.json
     */
    constructor(config) {

      /**
       * Cache of configuration
       * @member {object}
       */
      this.config = config;

      /* istanbul ignore if */
      if (config.debug_server)
        this._debug = console.debug;
      else
        this._debug = () => {};

      // Add a couple of dynamically computed defaults that need to
      // be sent with /defaults
      config.defaults.canEmail = (typeof config.mail !== "undefined");
      config.defaults.notification = config.defaults.notification &&
      (typeof config.https !== "undefined");

      /**
       * Games database
       * @member {Database}
       */
      this.db = new FileDatabase(config.games, "game");

      /**
       * Map from game key to Game. Games in this map have been loaded
       * from the DB (loadGame has been called for them)
       * @member {object.<string,Game>}
       */
      this.games = {};

      /**
       * Status-monitoring sockets (connections to games pages). Monitors
       * watch a subset of activity in ALL games.
       * @member {WebSocket[]}
       */
      this.monitors = [];

      process.on("unhandledRejection", reason => {
        /* istanbul ignore next */
        console.error("Command rejected", reason, reason ? reason.stack : "");
      });

      /**
       * Express server
       * @member {Express}
       */
      this.express = new Express();

      // Headers not added by passport?
      this.express.use(cors());

      // Parse incoming requests with url-encoded payloads
      this.express.use(Express.urlencoded({ extended: true }));

      // Parse incoming requests with a JSON body
      this.express.use(Express.json());

      // Can't use __dirname, only available in top level
      const staticRoot = Platform.getFilePath();
      // Grab all static files relative to the project root
      // html, images, css etc. The Content-type should be set
      // based on the file mime type (extension) but Express doesn't
      // always get it right.....
      this._debug("static files from", staticRoot);
      this.express.use(Express.static(staticRoot));

      // Debug report incoming requests
      this.express.use((req, res, next) => {
        this._debug("-->", req.method, req.url);
        next();
      });

      /**
       * User manager, handles logins etc.
       * @member {UserManager}
       */
      this.userManager = new UserManager(config, this.express);

      // Create a router for game commands
      const cmdRouter = Express.Router();

      cmdRouter.get(
        "/",
        (req, res) => res.sendFile(
          Platform.getFilePath("html/games_ui.html")));

      cmdRouter.get(
        "/games/:send",
        (req, res, next) => this.GET_games(req, res)
        .catch(next));

      cmdRouter.get(
        "/history",
        (req, res, next) => this.GET_history(req, res)
        .catch(next));

      cmdRouter.get(
        "/locales",
        (req, res, next) => this.GET_locales(req, res)
        .catch(next));

      cmdRouter.get(
        "/editions",
        (req, res, next) => this.GET_editions(req, res)
        .catch(next));

      cmdRouter.get(
        "/edition/:edition",
        (req, res, next) => this.GET_edition(req, res)
        .catch(next));

      cmdRouter.get(
        "/dictionaries",
        (req, res, next) => this.GET_dictionaries(req, res)
        .catch(next));

      cmdRouter.get(
        "/themes",
        (req, res, next) => this.GET_themes(req, res)
        .catch(next));

      cmdRouter.get(
        "/theme/:css",
        (req, res, next) => this.GET_theme(req, res)
        .catch(next));

      cmdRouter.get(
        "/node_modules/*",
        (req, res, next) => this.GET_npm_dependency(req, res)
        .catch(next));

      cmdRouter.get(
        "/defaults",
        (req, res, next) => this.GET_defaults(req, res));

      cmdRouter.get(
        "/game/:gameKey",
        (req, res, next) => this.GET_game(req, res));

      cmdRouter.post(
        "/createGame",
        (req, res, next) =>
        this.userManager.checkLoggedIn(req, res, next),
        (req, res, next) => this.POST_createGame(req, res)
        .catch(next));

      cmdRouter.post(
        "/invitePlayers/:gameKey",
        (req, res, next) =>
        this.userManager.checkLoggedIn(req, res, next),
        (req, res, next) => this.POST_invitePlayers(req, res)
        .catch(next));

      cmdRouter.post(
        "/deleteGame/:gameKey",
        (req, res, next) =>
        this.userManager.checkLoggedIn(req, res, next),
        (req, res, next) => this.POST_deleteGame(req, res)
        .catch(next));

      cmdRouter.post(
        "/anotherGame/:gameKey",
        (req, res, next) =>
        this.userManager.checkLoggedIn(req, res, next),
        (req, res, next) => this.POST_anotherGame(req, res)
        .catch(next));

      cmdRouter.post(
        "/sendReminder/:gameKey",
        (req, res, next) =>
        this.userManager.checkLoggedIn(req, res, next),
        (req, res, next) => this.POST_sendReminder(req, res)
        .catch(next));

      cmdRouter.post(
        "/join/:gameKey",
        (req, res, next) =>
        this.userManager.checkLoggedIn(req, res, next),
        (req, res, next) => this.POST_join(req, res)
        .catch(next));

      cmdRouter.post(
        "/leave/:gameKey",
        (req, res, next) =>
        this.userManager.checkLoggedIn(req, res, next),
        (req, res, next) => this.POST_leave(req, res)
        .catch(next));

      cmdRouter.post(
        "/addRobot/:gameKey",
        (req, res, next) =>
        this.userManager.checkLoggedIn(req, res, next),
        (req, res, next) => this.POST_addRobot(req, res)
        .catch(next));

      cmdRouter.post(
        "/removeRobot/:gameKey",
        (req, res, next) =>
        this.userManager.checkLoggedIn(req, res, next),
        (req, res, next) => this.POST_removeRobot(req, res)
        .catch(next));

      cmdRouter.post(
        "/command/:command/:gameKey",
        (req, res, next) =>
        this.userManager.checkLoggedIn(req, res, next),
        (req, res, next) => this.POST_command(req, res)
        .catch(next));

      this.express.use(cmdRouter);

      // Install error handler
      this.express.use((err, req, res, next) => {
        if (typeof err === "object" && err.code === "ENOENT") {
          // Special case of a database file load failure
          this._debug("<-- 404", req.url, Utils.stringify(err));
          res.status(404).send([
            "Database file load failed", req.url, err]);
        } else {
          this._debug("<-- 500", err);
          res.status(500).send(err);
        }
      });

      // Finally handle otherwise unhandled errors
      this.express.use(ErrorHandler({
        dumpExceptions: true,
        showStack: true
      }));
    }

    /**
     * Load the game from the DB, if not already in server memory
     * @param {string} key game key
     * @return {Promise} Promise that resolves to a {@linkcode Game}
     */
    loadGame(key) {
      /* istanbul ignore if */
      if (typeof key === "undefined")
        return Promise.reject("Game key is undefined");
      if (this.games[key])
        return Promise.resolve(this.games[key]);

      return this.db.get(key, Game.classes)
      .then(game => game.onLoad(this.db))
      .then(game => game.checkAge())
      .then(game => {
        Events.EventEmitter.call(game);

        Object.defineProperty(
          // makes connections non-persistent
          game, "connections", { enumerable: false });

        this.games[key] = game;
        /* istanbul ignore if */
        if (this.config.debug_game)
          game._debug = console.debug;

        return game.playIfReady();
      });
    }

    /**
     * Handle a `connect` coming over a socket.
     * Player or monitor connecting.
     * @param {socket.io} socket the socket
     * @private
     */
    socket_connect(sk) {
        this._debug("-S-> connect");
        this.updateMonitors();
    }

    /**
     * Handle a `disconnect` coming over a socket. Player or monitor
     * disconnecting. Don't need to refresh players using this
     * socket, because each Game has a 'disconnect' listener on each
     * of the sockets being used by players of that game.
     * @param {socket.io} socket the socket
     * @private
     */
    socket_disconnect(socket) {
      this._debug("-S-> disconnect");

      // Remove any monitor using this socket
      const i = this.monitors.indexOf(socket);
      if (i >= 0) {
        // Game monitor has disconnected
        this._debug("\tmonitor disconnected");
        this.monitors.slice(i, 1);
      } else
        this._debug("\tanonymous disconnect");
      this.updateMonitors();
    }

    /**
     * Handle game monitor (games interface) ann9ouncing on
     * a socket.
     * @param {socket.io} socket the socket
     * @private
     */
    socket_monitor(socket) {
      this._debug("-S-> monitor");
      this.monitors.push(socket);
    }

    /**
     * Handle a player (or observer) joining (or re-joining).
     * When the game interface is opened in a browser, the
     * interface initiates a socket connection. WebSockets then
     * sends `connect` to the UI. `JOIN` is then sent by the UI,
     * which connects the UI to the game. The UI may subsequently
     * die; which is OK, the server just keeps telling them what
     * is going on until it sees a `disconnect`.
     * @param {socket.io} socket the socket
     * @private
     */
    socket_join(socket, params) {
      this._debug(
        "-S-> join", params.playerKey, "joining", params.gameKey);
      this.loadGame(params.gameKey)
      .then(game => {
        return game.connect(socket, params.playerKey)
        .then(() => {
          // Tell everyone in the game
          game.sendCONNECTIONS();
          // Tell games pages
          this.updateMonitors();
        });
      })
      /* istanbul ignore next */
      .catch(e => {
        console.error("socket join error:", e);
      });
    }

    /**
     * Handle a `MESSAGE` notification coming from a player.
     * @param {socket.io} socket the socket
     * @param {string} message the message. This is a text string,
     * which is normally passed on to other players. There are
     * some special commands: `hint` will asynchrnously generate
     * a hint for the current player, while `advise` will toggle
     * post-play analysis. `allow` is used to add a word to the
     * dictionary whitelist.
     * @private
     */
    socket_message(socket, message) {

      if (!socket.game)
        return;

      // Chat message
      this._debug("-S-> message", message);
      const mess = message.text.split(/\s+/);
      const verb = mess[0];

      switch (verb) {

      case "autoplay":
        // Tell *everyone else* that they asked for a hint
        socket.game.notifyOthers(socket.player, Notify.MESSAGE, {
          sender: /*i18n*/"Advisor",
          text: /*i18n*/"played-for",
          classes: "warning",
          args: [ socket.player.name ],
          timestamp: Date.now()
        });
        socket.game.autoplay();
        break;

      case "hint":
        socket.game.hint(socket.player);
        break;

      case "advise":
        socket.game.toggleAdvice(socket.player);
        break;

      case "allow":
        socket.game.allow(socket.player, mess[1]);
        break;

      default:
        socket.game.notifyAll(Notify.MESSAGE, message);
      }
    }

    /**
     * Attach the handlers for incoming socket messages from the UI.
     * @param {socket.io} socket the socket to listen to
     * @private
     */
    attachSocketHandlers(socket) {
      socket
      .on("connect", () => this.socket_connect(socket))
      .on("disconnect", () => this.socket_disconnect(socket))
      .on(Notify.MONITOR, () => this.socket_monitor(socket))
      .on(Notify.JOIN, params => this.socket_join(socket, params))
      .on(Notify.MESSAGE, message => this.socket_message(socket, message));
    }

    /**
     * Notify monitors that something about the game has
     * changed requiring an update..
     * @private
     */
    updateMonitors() {
      this._debug("<-S- update *");
      this.monitors.forEach(socket => socket.emit(Notify.UPDATE));
    }

    /**
     * @param {object} to a lookup suitable for use with UserManager.getUser
     * @param {Request} req the request object
     * @param {Response} res the response object
     * @param {string} gameKey game to which this applies
     * @param {string} subject subject
     * @param {string} text email text
     * @param {string} html email html
     * @return {Promise} Promise that resolves to the user that was mailed,
     * either their game name or their email if there is no game name.
     * @private
     */
    sendMail(to, req, res, gameKey, subject, text, html) {
      Platform.assert(this.config.mail && this.config.mail.transport,
                      "Mail is not configured");
      return this.userManager.getUser(
        {key: req.session.passport.user.key})
      .then(sender => `${sender.name}<${sender.email}>`)
      .catch(
        // should never happen so long as only logged-in
        // users can send mail
        /* istanbul ignore next */
        e => this.config.mail.sender)
      .then(sender =>
            new Promise(
              resolve => this.userManager.getUser(to, true)
              .catch(e => {
                // Not a known user, rely on email in the
                // getUser query
                resolve({
                  name: to.email, email: to.email
                });
              })
              .then(uo => resolve(uo)))
            .then(uo => {
              if (!uo.email) // no email
                return Platform.i18n("no-email",
                                     uo.name || uo.key);
              this._debug(
                subject,
                `${uo.name}<${uo.email}> from `,
                sender);
              return this.config.mail.transport.sendMail({
                from: sender,
                to: uo.email,
                subject: subject,
                text: text,
                html: html
              })
              .then(() => uo.name || uo.email);
            }));
    }

    /**
     * Get a simplified version of games or a single game (no board,
     * bag etc) for the "games" page. You can request "active" games
     * (those still in play), "all" games (for finished games too),
     * or a single game key. c.f. /game/:gameKey, which is used to
     * get a full Game.
     * @param {Request} req the request object
     * @param {string} req.params.send a single game key to
     * get a single game, `active` to get active games, or `all`
     * to get all games, including finished games.
     * @param {Response} res the response object. The response body is
     * a list of objects generated by
     * {@linkcode Game#serialisable|Game.serialisabable()}
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    GET_games(req, res, next) {
      const server = this;
      const send = req.params.send;
      // Make list of keys we are interested in
      return ((send === "all" || send === "active")
              ? this.db.keys()
              : Promise.resolve([send]))
      // Load those games
      .then(keys => Promise.all(keys.map(key => this.loadGame(key))))
      // Filter the list and generate simple data
      .then(games => Promise.all(
        games
        .filter(game => (send !== "active" || !game.hasEnded()))
        .map(game => game.serialisable(this.userManager))))
      // Sort the resulting list by last activity, so the most
      // recently active game bubbles to the top
      .then(gs => gs.sort((a, b) => a.lastActivity < b.lastActivity ? 1
                          : a.lastActivity > b.lastActivity ? -1 : 0))
      // Finally send the result
      .then(data => {
        this._debug("<-- 200 simple", send);
        return res.status(200).send(data);
      });
    }

    /**
     * Sends a summary of cumulative player scores to date, for all
     * unique players.
     * @param {Request} req the request object
     * @param {Response} res the response object. The response body
     * is a list of objects, each with keys as follows:
     * * key: player key
     * * name: player name
     * * score: total cumulative score
     * * wins: number of wins
     * * games: number of games played
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    GET_history(req, res, next) {
      const server = this;

      return this.db.keys()
      .then(keys => keys.map(key => this.loadGame(key)))
      .then(promises => Promise.all(promises))
      .then(games => {
        const results = {};
        games
        .filter(game => game.hasEnded())
        .map(game => {
          const winScore = game.winningScore();
          game.getPlayers().forEach(
            player => {
              let result = results[player.key];
              if (!result) {
                results[player.key] =
                result = {
                  key: player.key,
                  name: player.name,
                  score: 0,
                  wins: 0,
                  games: 0
                };
              }
              result.games++;
              if (player.score === winScore)
                result.wins++;
              result.score += player.score;
            });
        });
        const list = [];
        for (let name in results)
          list.push(results[name]);
        return list;
      })
      .then(list => list.sort((a, b) => a.score < b.score ? 1
                              : (a.score > b.score ? -1 : 0)))
      .then(list => res.status(200).send(list));
    }

    /**
     * Sends a list of available translation locales, as read from the
     * `/i18n` directory.
     * @param {Request} req the request object
     * @param {Response} res the response object. The response body
     * will be a list of locale name strings.
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    GET_locales(req, res, next) {
      const db = new FileDatabase("i18n", "json");
      return db.keys()
      .then(keys => res.status(200).send(keys));
    }

    /**
     * Sends a list of available editions.
     * @param {Request} req the request object
     * @param {Response} res the response object. The response body
     * will be a list of edition name strings.
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    GET_editions(req, res) {
      return Fs.readdir(Platform.getFilePath("editions"))
      .then(list => {
        const regex = /^[^_].*\.js$/i
        return list.filter(f => regex.test(f))
      })
      .then(list => {
        const regex = /\.js$/i
        return list.map(f => f.replace(regex, ''))
      })
      .then(list => res.status(200).send(list));
    }

    /**
     * Get the named edition.
     * @param {Request} req the request object
     * @param {string} req.params.edition name of edition to send
     * @param {Response} res the response object. The response body
     * will be the JSON for the edition.
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    GET_edition(req, res) {
      return Edition.load(req.params.edition)
      .then(edition => {
        console.log(edition);
        res.status(200).send(edition);
      });
    }

    /**
     * Get a list of the available dictionaries.
     * @param {Request} req the request object
     * @param {Response} res the response object. The response body
     * will be a list of available dictionary name strings.
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    GET_dictionaries(req, res) {
      return Fs.readdir(Platform.getFilePath("dictionaries"))
      .then(list => res.status(200).send(
        list.filter(f => /\.dict$/.test(f))
        .map(fn => fn.replace(/\.dict$/, ""))));
    }

    /**
     * Sends a list of the available themes. A theme is a set of CSS
     * files in a subdirectory of `/css`, each of which corresponds to
     * a CSS file in `css/default`. The theme CS can override some or
     * all of the default CSS.
     * @param {Request} req the request object
     * @param {Response} res the response object. The response will be
     * a list of theme name strings.
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    GET_themes(req, res) {
      const dir = Platform.getFilePath("css");
      return Fs.readdir(dir)
      .then(list => res.status(200).send(list));
    }

    /**
     * Sends the css for current theme, if a user is logged in and
     * they have selected a theme. The CSS sent is created by concatenating
     * `/css/default/<file>` and `/css/<theme>/<file>`.
     * @param {Request} req the request object
     * @param {string} req.params.css name of the css file to send
     * @param {Response} res the response object. The result will be the
     * generated CSS content.
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    GET_theme(req, res) {
      let theme = "default";
      if (req.user && req.user.settings && req.user.settings.theme)
        theme = req.user.settings.theme;
      this._debug("Send theme", theme, req.params.css);
      let promises = [];
      promises.push(
        Fs.readFile(Platform.getFilePath(`css/default/${req.params.css}`))
        .then(data => data.toString()));
      if (theme !== "default")
        promises.push(
          Fs.readFile(Platform.getFilePath(`css/${theme}/${req.params.css}`))
          .catch(e => `/*Could not load css/${theme}/${req.params.css}`)
          .then(data => data.toString()));
      return Promise.all(promises)
      .then(parts => res
            .header('Content-Type', 'text/css')
            .status(200)
            .send(parts.join("")));
    }

    GET_npm_dependency(req, res) {
      const param = req.params[0]

      return (!param)
        ? Promise.reject(new Error('invalid path to dependency'))
        : Promise.resolve()
          .then(() => requirejs.nodeRequire.resolve(param))
          .catch((e) => {
            if ((e.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') && (e.code !== 'ENOENT')) throw e

            const index = param.indexOf('/')
            if (index === -1) throw e

            const dependency = {
              name: param.substring(0, index),
              path: param.substring(index + 1, param.length).replaceAll('[..]/', '../')
            }

            let resolved_path
            resolved_path = requirejs.nodeRequire.resolve(dependency.name)
            resolved_path = Path.dirname(resolved_path)
            resolved_path = Path.resolve(resolved_path, dependency.path)
            return resolved_path
          })
          .then(npm_dependency_path => Fs.readFile(npm_dependency_path))
          .then(data => data.toString())
          .then(data => {
            const type = ((param.length >= 3) && (param.substring(param.length - 3, param.length).toLowerCase() === 'css'))
              ? 'text/css'
              : 'text/javascript'

            res
              .header('Content-Type', type)
              .status(200)
              .send(data)
          })
    }

    /**
     * Create a new game.
     * @param {Request} req the request object. The body will contain
     * the parameters to pass to the {@linkcode Game} constructor.
     * @param {Response} res the response object
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent. The response is the game key of
     * the new game.
     * @private
     */
    POST_createGame(req, res) {
      return Edition.load(req.body.edition)
      .then(edition => new Game(req.body).create())
      .then(game => game.onLoad(this.db))
      .then(game => {
        /* istanbul ignore if */
        if (this.config.debug_game)
          game._debug = console.debug;
        this._debug("Created game", game.stringify());
        return game.save();
      })
      .then(game => res.status(200).send(game.key))
      .then(() => this.updateMonitors());
    }

    /**
     * Invite players by email. Parameters are passed in the request body.
     * This wil ldo nothing if the server is not configured to send
     * email.
     * @param {Request} req the request object
     * @param {string} req.params.gameKey the game key
     * @param {Response} res the response object
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    POST_invitePlayers(req, res, next) {
      Platform.assert(this.config.mail && this.config.mail.transport,
                      "Mail is not configured");
      Platform.assert(req.body.player, "Nobody to notify");
      const gameKey = req.params.gameKey;
      const gameURL =
            `${req.protocol}://${req.get("Host")}/html/games_ui.html?untwist=${gameKey}`;
      let textBody = (req.body.message || "") + "\n" + Platform.i18n(
        "email-invite-plain", gameURL);
      // Handle XSS risk posed by HTML in the textarea
      let htmlBody = (req.body.message.replace(/</g, "&lt;") || "")
          + "<br>" + Platform.i18n(
            "email-html-link", gameURL);
      let subject = Platform.i18n("email-invited");
      return Promise.all(req.body.player.map(
        to => this.sendMail(
          to, req, res, req.body.gameKey,
          subject, textBody, htmlBody)))
      .then(list => {
        const names = list.filter(uo => uo);
        this._debug("<-- 200 ", names);
        return res.status(200).send(names);
      });
    }

    /**
     * Email reminders to next human player in (each) game
     * @param {Request} req the request object
     * @param {string} req.params.gameKey the game key
     * @param {Response} res the response object. The response body
     * will be a list of the player names (or email, if they have no
     * player name) of players who have been notified.
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    POST_sendReminder(req, res, next) {
      const gameKey = req.params.gameKey;
      this._debug("Sending turn reminders to", gameKey);
      const gameURL =
            `${req.protocol}://${req.get("Host")}/game/${gameKey}`;

      const prom = (gameKey === "*")
            ? this.db.keys() : Promise.resolve([gameKey]);

      return prom
      .then(keys => Promise.all(keys.map(
        key => (this.games[key]
                ? Promise.resolve(this.games[key])
                : this.db.get(key, Game.classes))
        .then(game => {
          const pr = game.checkAge();
          if (game.hasEnded())
            return undefined;

          const player = game.getPlayer();
          if (!player)
            return undefined;
          this._debug("Sending reminder mail to",
                      `${player.name}/${player.key}`);

          const subject = Platform.i18n(
            "email-remind");
          const textBody = Platform.i18n(
            "email-invite-plain",
            gameURL);
          const htmlBody = Platform.i18n(
            "email-html-link",
            gameURL);
          return this.sendMail(
            player, req, res, game.key,
            subject, textBody, htmlBody);
        }))))
      .then(reminders => reminders.filter(e => typeof e !== "undefined"))
      .then(names => {
        this._debug("<-- 200", names);
        return res.status(200).send(names);
      });
    }

    /**
     * Player wants to join a game. Requested by the games interface,
     * and by the "Next game" button in the game UI. It ensures the
     * game is loaded and adds the player indicated by the session
     * indicated in the request (if necessary).
     * @param {Request} req the request object
     * @param {string} req.params.gameKey the game key
     * @param {Response} res the response object. The response body
     * will be the player key.
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    POST_join(req, res, next) {
      const gameKey = req.params.gameKey;
      return this.loadGame(gameKey)
      .then(game => {
        // Player is either joining or connecting
        const playerKey = req.user.key;
        let player = game.getPlayerWithKey(playerKey);
        let prom;
        if (player) {
          this._debug("Player", playerKey, "opening", gameKey);
          prom = Promise.resolve(game);
        } else {
          this._debug("Player", playerKey, "joining", gameKey);
          player = new Player(
            { name: req.user.name, key: playerKey });
          game.addPlayer(player, true);
          prom = game.save();
        }
        // The game may now be ready to start
        return prom.then(game => game.playIfReady())
        .then(() => res.status(200).send(player.key));
        // Don't need to send connections, that will be done
        // in the connect event handler
      });
    }

    /**
     * Add a robot to the game.  It's an error to add a robot to a
     * game that already has a robot.
     * @param {Request} req the request object
     * @param {string} req.params.gameKey the game key
     * @param {string} req.body.dictionary optional dictionary name to
     * use for generating robot plays. May be `non` for no dictionary.
     * @param {Response} res the response object. The response body will
     * be the robot player key.
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    POST_addRobot(req, res, next) {
      const gameKey = req.params.gameKey;
      const dic = req.body.dictionary;
      let game;
      return this.loadGame(gameKey)
      .then(g => game = g)
      .then(() => {
        Platform.assert(!game.hasRobot(), "Game already has a robot");

        this._debug("Robot joining", gameKey, "with", dic);
        // Robot always has the same player key
        const robot = new Player(
          {
            name: "Robot",
            key: UserManager.ROBOT_KEY,
            isRobot: true,
            canChallenge: req.body.canChallenge,
            delayBeforePlay: parseInt(req.body.delayBeforePlay || "0")
          });
        if (dic && dic !== "none")
          /* istanbul ignore next */
          robot.dictionary = dic;
        game.addPlayer(robot, true);
        return game.save()
        // Game may now be ready to start
        .then(() => game.playIfReady())
        .then(() => {
          this.updateMonitors();
          game.sendCONNECTIONS();
        })
        .then(() => res.status(200).send(robot.key));
      });
    }

    /**
     * Remove the robot from a game. Will throw an error if the game doesn't
     * have a robot.
     * @param {Request} req the request object
     * @param {string} req.params.gameKey the game key
     * @param {Response} res the response object. The response body will
     * be the removed robot player key.
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    POST_removeRobot(req, res, next) {
      const gameKey = req.params.gameKey;
      return this.loadGame(gameKey)
      .then(game => {
        const robot = game.hasRobot();
        Platform.assert(robot, "Game doesn't have a robot");
        this._debug("Robot leaving", gameKey);
        game.removePlayer(robot);
        return game.save()
        // Game may now be ready to start
        .then(game => game.playIfReady())
        .then(() => {
          game.sendCONNECTIONS();
          this.updateMonitors();
        })
        .then(() => res.status(200).send(robot.key));
      });
    }

    /**
     * Handle /leave/:gameKey player leaving a game.
     * @param {Request} req the request object
     * @param {string} req.params.gameKey the game key
     * @param {Response} res the response object
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    POST_leave(req, res, next) {
      const gameKey = req.params.gameKey;
      const playerKey = req.user.key;
      return this.loadGame(gameKey)
      .then(game => {
        this._debug("Player", playerKey, "leaving", gameKey);
        const player = game.getPlayerWithKey(playerKey);
        if (player) {
          // Note that if the player leaving dips the number
          // of players below minPlayers for the game, the
          // game state is reset to WAITING
          game.removePlayer(player);
          return game.save()
          .then(() => res.status(200).send("OK"))
          .then(() => this.updateMonitors());
        }
        /* istanbul ignore next */
        return Platform.fail(
          `Player ${playerKey} is not in game ${gameKey}`);
      });
    }

    /**
     * Send the `defaults` section of the server configuration.
     * @param {Request} req the request object
     * @param {Response} res the response object. The body will be
     * the defaults object from the server configuration file.
     */
    GET_defaults(req, res) {
      res.status(200).send(this.config.defaults);
    }

    /**
     * This is designed for use when opening the `game` interface.
     * The game is frozen using {@linkcode Fridge} before sending to fully
     * encode the entire {@linkcode Game} object, including the
     * {@linkcode Player}s, {@linkcode Turn} history, and the {@linkcode Board}
     * so they can be recreated client-side. Subsequent commands and
     * notifications maintain the client-side game object incrementally
     * to keep them in synch with the server Game object.
     * @param {Request} req the request object
     * @param {string} req.params.gameKey the game key
     * @param {Response} res the response object
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    GET_game(req, res, next) {
      const gameKey = req.params.gameKey;
      return this.db.get(gameKey, Game.classes)
      .then(game => res.status(200).send(Fridge.freeze(game)));
    }

    /**
     * Delete a game.
     * @param {Request} req the request object
     * @param {string} req.params.gameKey the game key
     * @param {Response} res the response object. The response body
     * will be the deleted game key.
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    POST_deleteGame(req, res, next) {
      const gameKey = req.params.gameKey;
      this._debug("Delete game", gameKey);
      return this.loadGame(gameKey)
      .then(game => game.stopTheClock()) // in case it's running
      .then(() => this.db.rm(gameKey))
      .then(() => res.status(200).send(gameKey))
      .then(() => this.updateMonitors());
    }

    /**
     * Create another game with the same players.
     * Note this is NOT auth-protected, it is invoked
     * from the game interface to create a follow-on game
     * @param {Request} req the request object
     * @param {string} req.params.gameKey the game key
     * @param {Response} res the response object. The response body
     * will be the follow-on game key.
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    POST_anotherGame(req, res, next) {
      return this.loadGame(req.params.gameKey)
      .then(game => game.anotherGame())
      .then(newGame => res.status(200).send(newGame.key));
    }

    /**
     * Handle /command/:command/:gameKey. Command results are broadcast
     * in Turn objects.
     * @param {Request} req the request object
     * @param {string} req.params.command the command, one of
     * {@linkcode Types}.Command
     * @param {string} req.params.gameKey the game key
     * @param {Response} res the response object
     * @return {Promise} promise that resolves to undefined
     * when the response has been sent.
     * @private
     */
    POST_command(req, res, next) {
      const command = req.params.command;
      const gameKey = req.params.gameKey;
      const playerKey = req.user.key;
      //this._debug("Handling", command, gameKey, playerKey);
      return this.loadGame(gameKey)
      .then(game => {
        if (game.hasEnded() && command !== Command.UNDO)
          // Ignore the command
          return Promise.resolve();

        const player = game.getPlayerWithKey(playerKey);
        Platform.assert(player,
            `Player ${playerKey} is not in game ${gameKey}`);

        // The command name and arguments
        const args = req.body;

        // Add a timestamp, unless the sender provided one
        if (typeof req.body.timestamp === "undefined")
          req.body.timestamp = Date.now();

        this._debug("COMMAND", command,
                    "player", player.name,
                    "game", game.key);

        // Istanbul can ignore next because it's just routing
        /* istanbul ignore next */
        switch (command) {

        case Command.CHALLENGE:
          return game.challenge(
            player, game.getPlayerWithKey(args.challengedKey));

        case Command.CONFIRM_GAME_OVER:
          return game.confirmGameOver(player);

        case Command.PASS:
          return game.pass(player, Turns.PASSED);

        case Command.PAUSE:
          return game.pause(player);

        case Command.PLAY:
          return game.play(player, args);

        case Command.REDO:
          return game.redo(args);

        case Command.SWAP:
          return game.swap(player, args);

        case Command.TAKE_BACK:
          return game.takeBack(player, Turns.TOOK_BACK);

        case Command.UNDO:
          game.undo(game.popTurn());
          break;

        case Command.UNPAUSE:
          return game.unpause(player);

        default:
          return Platform.fail(`unrecognized command: ${command}`);
        }
      })
      .then(() => {
        //this._debug(command, "handled`);
        // Notify games pages
        this.updateMonitors();
        return res.status(200).send("OK");
      });
    }
  }

  return Server;
});
