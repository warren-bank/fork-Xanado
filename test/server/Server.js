/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env node, mocha */

/* global Platform */

import chai from "chai";
import http from "chai-http";
chai.use(http);
const expect = chai.expect;
import { promises as Fs } from "fs";
import { ServerPlatform } from "../../src/server/ServerPlatform.js";
global.Platform = ServerPlatform;
import { exec } from "child_process";
import tmp from "tmp-promise";

import { TestSocket } from '../TestSocket.js';
import { Server } from "../../src/server/Server.js";
import { Game } from "../../src/game/Game.js";
import { UserManager } from "../../src/server/UserManager.js";
import sparseEqual from "../sparseEqual.js";
/**
 * Basic unit tests for Server class.
 */
describe("server/Server.js", () => {

  const config = {
    auth: {
      db_file: "delayed"
    },
    defaults: {
      edition: "Test",
      dictionary: "Oxford_5000",
      theme: "default"
    },
    games: "delayed"
  };

  beforeEach(
    () => {
      return tmp.dir()
      .then(d => UserManager.SESSIONS_DIR = d.path)
      .then(() => tmp.file())
      .then(o => config.auth.db_file = o.path)
      .then(() => tmp.dir())
      .then(o => {
        config.games = o.path;
      })
      .then(() => Platform.i18n().load("en-GB"));
    });

  afterEach(() => process.removeAllListeners("unhandledRejection"));
  
  // Promise to register user. Resolve to user key.
  function register(server, user) {
    return chai.request(server.express)
    .post("/register")
    .set('content-type', 'application/x-www-form-urlencoded')
    .send(user)
    .then(res => {
      assert.equal(res.status, 200);
      sparseEqual(res.body, {
        name: user.register_username,
        provider: "xanado"
      });
      assert(res.body.key.length > 1);
      assert(!res.body.email);
      return res.body.key;
    });
  }
  
  // Promise to signin user. Resolve to session_cookie.
  function signin(server, user) {
    return chai.request(server.express)
    .post("/signin")
    .send(user)
    .then(res => {
      assert.equal(res.status, 200);
      return res.header["set-cookie"];
    });
  }

  function UNit() {}

  it("i18n", () => {
    return Platform.i18n().load("qqq")
    .then(() => {
      assert.equal(
        Platform.i18n("Unknown message $1", "X"), "Unknown message X");
      assert.equal(
        Platform.i18n("SWAP"), "Letters underlying the swap rack");
    });
  });
  
  it("/defaults", () => {
    const s = new Server(config);
    return chai.request(s.express)
    .get("/defaults")
    .then(res => {
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, {
        edition: "Test",
        dictionary: "Oxford_5000",
        theme: "default",
        canEmail: false
      });
      delete(s.express);
    });
  });

  it("/games/all", () => {
    const s = new Server(config);
    return chai.request(s.express)
    .get("/games/all")
    .then(res => {
      assert.equal(res.status, 200, res.body);
      //console.log(res.body);
    });
  });

  it("/games/active", () => {
    const s = new Server(config);
    return chai.request(s.express)
    .get("/games/active")
    .then(res => {
      assert.equal(res.status, 200, res.body);
      //console.log(res.body);
    });
  });

  it("/games/:gameKey", () => {
    let server = new Server(config), cookie, gamekey, playerkey;
    return register(server, {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    })
    .then(pk => {
      playerkey = pk;
      return signin(server, {
        signin_username: "test_user",
        signin_password: "test_pass"
      });
    })
    .then(c => {
      cookie = c;
      return chai.request(server.express)
      .post("/createGame")
      .set('Cookie', cookie)
      .send({
        edition: "English_Scrabble",
        dictionary:"Oxford_5000"
      });
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200);
      gamekey = res.text;
      return chai.request(server.express)
      .get(`/games/${gamekey}`);
    })
    .then(res => {
      assert.equal(res.status, 200, res.body);
      const simple = res.body[0];
      assert.equal(simple.key, gamekey);
      assert.equal(simple.edition, "English_Scrabble");
      assert.equal(simple.state, Game.State.WAITING);
    });
  });

  it("/locales", () => {
    const s = new Server(config);
    return chai.request(s.express)
    .get("/locales")
    .then(res => {
      //console.log(res.body);
      assert(res.body.indexOf('en') >= 0);
      assert(res.body.indexOf('fr') >= 0);
      assert(res.body.indexOf('de') >= 0);
      assert(res.body.indexOf('qqq') >= 0);
      assert.equal(res.status, 200);
    });
  });

  it("/editions", () => {
    const s = new Server(config);
    return chai.request(s.express)
    .get("/editions")
    .then(res => {
      assert(res.body.indexOf('English_Lexulous') >= 0);
      assert(res.body.indexOf('English_WWF') >= 0);
      assert.equal(res.status, 200);
    });
  });

  it("/dictionaries", () => {
    const s = new Server(config);
    return chai.request(s.express)
    .get("/dictionaries")
    .then(res => {
      assert(res.body.indexOf('SOWPODS_English') >= 0);
      assert(res.body.indexOf('CSW2019_English') >= 0);
      assert.equal(res.status, 200);
    });
  });

  it("/css", () => {
    const s = new Server(config);
    return chai.request(s.express)
    .get("/css")
    .then(res => {
      assert.equal(res.status, 200);
      assert(res.body.indexOf('default') >= 0);
    });
  });

  it("/join observer", () => {
    const server = new Server(config);
    let gamekey, cookie;
    return register(server, {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    })
    .then(() => signin(server, {
      signin_username: "test_user",
      signin_password: "test_pass"
    }))
    .then(c => {
      cookie = c;
      return chai.request(server.express)
      .post("/createGame")
      .set('Cookie', cookie)
      .send({
        edition: "English_Scrabble",
        dictionary:"Oxford_5000"
      });
    })
    .then(res => {
      assert.equal(res.status, 200);
      gamekey = res.text;
      return chai.request(server.express)
      .post("/signout")
      .set('Cookie', cookie);
    })
    .then(res => {
      assert.equal(res.status, 200);
      return chai.request(server.express)
      .get(`/join/${gamekey}?observer=Dirty%20Old%20Man`);
    })
    .then(res => {
      const url = res.text;
      assert(/[?&]observer=Dirty%20Old%20Man(&|;|$)/.test(url));
      assert(/[?&]game=[0-9a-f]+(&|;|$)/.test(url));
      assert(url.indexOf(`game=${gamekey}`) > 0);
      assert(/\/dist\/client_game.html\?/.test(url));
      assert.equal(res.status, 200, res.text);
    });
  });
  
  it("/createGame - /join - /addRobot - /game - /leave - /removeRobot - /games / - /history - /deleteGame", () => {
    let server = new Server(config), cookie, gamekey, playerkey;
    //server.debug = console.debug;
    const serverSock = new TestSocket("server");
    const clientSock = new TestSocket("client");
    server.attachSocketHandlers(serverSock);

    serverSock
    .on("*", (params, event) => {
      console.log("SERVER SHOULD NEVER SEE", event, params);
    });

    let sawTurn = false;
    clientSock.on(Game.Notify.MESSAGE, (data, event, seqNo) => {
      //assert(sawTurn); not if human ends up first player
      //console.log("INCOMING message",data);
      if (data.sender === "Advisor") {
        switch (data.text) {
        case "log-word-added":
          assert.deepEqual(data.args, [
            "test_user", "FROBNOZZ", "Oxford_5000" ]);
          return;
          
        case "word-there":
          assert.deepEqual(data.args, [ "ABSTRACT", "Oxford_5000" ]);
          return;
          
        case "_hint_":
          assert(data.args.length === 4);
          clientSock.done();
          serverSock.done();
          return;
        }
      }
      assert.fail(data);
    })
    .on(Game.Notify.TURN, (turn, event, seqNo) => {
      //console.log("INCOMING turn");
      assert.equal(turn.playerKey, UserManager.ROBOT_KEY);
      assert.equal(turn.gameKey, gamekey);
      sawTurn = true;
    })
    .on(Game.Notify.CONNECTIONS, (params, event) => {})
    .on("*", (params, event) => {
      console.log("CLIENT GOT", event, params);
    });

    serverSock.connect(clientSock);

    return register(server, {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    })
    .then(pk => {
      assert(pk);
      playerkey = pk;
      return signin(server, {
        signin_username: "test_user",
        signin_password: "test_pass"
      });
    })
    .then(c => {
      cookie = c;
      return chai.request(server.express)
      .post("/createGame")
      .set('Cookie', cookie)
      .send({
        edition: "English_Scrabble",
        dictionary:"Oxford_5000"
      });
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200);
      gamekey = res.text;
      return chai.request(server.express)
      .post(`/join/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200, res.text);
      clientSock.emit(Game.Notify.JOIN, {
        gameKey: gamekey,
        playerKey: playerkey
      });
      // Should silently go nowhere, not in a game yet
      clientSock.emit(Game.Notify.MESSAGE, {
        text: "yoohoo!"
      });
      return chai.request(server.express)
      .post(`/addRobot/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200, res.text);
      clientSock.emit(Game.Notify.MESSAGE, {
        text: "allow frobnozz"
      });
      clientSock.emit(Game.Notify.MESSAGE, {
        text: "allow abstract"
      });
      return chai.request(server.express)
      .get(`/game/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200);
      clientSock.emit(Game.Notify.MESSAGE, { text: "hint" });
      return chai.request(server.express)
      .post(`/leave/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200);
      return chai.request(server.express)
      .post(`/removeRobot/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200);
      return chai.request(server.express)
      .get("/history");
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200);
      return chai.request(server.express)
      .post(`/deleteGame/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200);
      return serverSock.wait();
    });
  });

  it("monitors", () => {
    const s = new Server(config);
    const serverSock = new TestSocket("monitor");
    s.attachSocketHandlers(serverSock);
    serverSock.emit("connect");
    serverSock.emit("disconnect");
    serverSock.emit(Game.Notify.MONITOR); // Add as monitor
    serverSock.emit("disconnect"); // remove monitor
  });

  it("/anotherGame", () => {
    let server = new Server(config), cookie, gamekey, playerkey;
    return register(server, {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    })
    .then(pk => {
      playerkey = pk;
      return signin(server, {
        signin_username: "test_user",
        signin_password: "test_pass"
      });
    })
    .then(c => {
      cookie = c;
      return chai.request(server.express)
      .post("/createGame")
      .set('Cookie', cookie)
      .send({
        edition: "English_Scrabble",
        dictionary:"CSW2019_English"
      });
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200);
      gamekey = res.text;
      return chai.request(server.express)
      .post(`/join/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      assert(/player=/.test(res.text));
      assert(/game=/.test(res.text));
      //console.log(res.text);
      assert.equal(res.status, 200, res.text);
      return chai.request(server.express)
      .post(`/addRobot/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200, res.text);
      return chai.request(server.express)
      .post(`/anotherGame/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      assert.equal(res.status, 200);
      assert.notEqual(res.text, gamekey);
      assert.match(res.text, /^[0-9a-z]{16}$/i);
    });
  });

  it("/command/:command/:gameKey", () => {
    let server = new Server(config), cookie, gamekey;
    return register(server, {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    })
    .then(() => signin(server, {
      signin_username: "test_user",
      signin_password: "test_pass"
    }))
    .then(c => {
      cookie = c;
      return chai.request(server.express)
      .post("/createGame")
      .set('Cookie', cookie)
      .send({
        edition: "English_Scrabble",
        dictionary:"CSW2019_English"
      });
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200);
      gamekey = res.text;
      return chai.request(server.express)
      .post(`/join/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      assert(/player=/.test(res.text));
      assert(/game=/.test(res.text));
      assert.equal(res.status, 200, res.text);
      return chai.request(server.express)
      .post(`/addRobot/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200, res.text);
      return chai.request(server.express)
      .post(`/command/confirmGameOver/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200, res.text);
    });
  });

  it("401", () => {
    let server = new Server(config), cookie, gamekey, playerkey;
    const proms = [
      chai.request(server.express)
      .post("/createGame")
      .then(res => {
        assert.equal(res.status, 401);
      }),

      chai.request(server.express)
      .post("/command/wibble/notakey")
      .then(res => {
        assert.equal(res.status, 401);
      })
    ];

    for (let route of [
      "deleteGame", "anotherGame", "sendReminder",
      "join", "leave", "addRobot", "removeRobot",
      "invitePlayers"
    ]) {
      proms.push(
        chai.request(server.express)
        .post(`/${route}/:notakey`)
        .then(res => {
          assert.equal(res.status, 401);
        }));
    }
    return Promise.all(proms);
  });

  it("/invitePlayers", () => {
    let server = new Server(config), cookie, gamekey, playerkey;
    return register(server, {
      register_username: "no_email_user"
    })
    .then(() => register(server, {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    }))
    .then(() => signin(server, {
      signin_username: "test_user",
      signin_password: "test_pass"
    }))
    .then(c => {
      cookie = c;
      return chai.request(server.express)
      .get("/session")
      .set('Cookie', cookie)
      .then(res => {
        assert.equal(res.status, 200);
        playerkey = res.body.key;
      });
    })
    .then(() => chai.request(server.express)
          .post("/createGame")
          .set('Cookie', cookie)
          .send({
            edition: "English_Scrabble",
            dictionary:"CSW2019_English"
          }))
    .then(res => {
      assert.equal(res.status, 200);
      gamekey = res.text;
      // server.mail.transport hasn't been configured yet
      assert(!server.config.mail);
      //server._debug = console.debug;
      let token;
      server.config.mail = {
        sender: "unit tests",
        transport: {
          sendMail: function(email) {
            //console.log(email);
            assert.equal(email.from, "test_user<test@email.com>");
            assert(email.to === "test@email.com"
                   || email.to === "user@email.com");
            assert.equal(email.subject, Platform.i18n("email-invited"));
            assert(email.text);
            assert(email.text.indexOf("Hollow Wurld") >= 0);
            assert(email.text.indexOf(`/html/client_games.html?untwist=${gamekey}`) >= 0);
            return Promise.resolve();
          }
        }
      };
      return chai.request(server.express)
      .post(`/invitePlayers/${gamekey}`)
      .send({player: [
        { key: playerkey },
        { name: "no_email_user" },
        { email: "user@email.com" }
      ], message: "Hollow Wurld"})
      .set('Cookie', cookie);
    })
    .then(res => {
      assert.deepEqual(res.body, [
        "test_user",
        "(no_email_user has no email address)",
        "user@email.com"
      ]);
      assert.equal(res.status, 200);
    });
  });

  it("/sendReminder", () => {
    let cookie, gamekey, playerkey;
    let server = new Server(config);
    return register(server, {
      register_username: "test_user",
      register_password: "test_pass",
      register_email: "test@email.com"
    })
    .then(() => signin(server, {
      signin_username: "test_user",
      signin_password: "test_pass"
    }))
    .then(c => cookie = c)
    .then(() => chai.request(server.express)
          .get("/session")
          .set('Cookie', cookie))
    .then(res => {
      assert.equal(res.status, 200);
      playerkey = res.body.key;
      return chai.request(server.express)
      .post("/createGame")
      .set('Cookie', cookie)
      .send({
        edition: "English_Scrabble",
        dictionary:"CSW2019_English"
      });
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200);
      gamekey = res.text;
      return chai.request(server.express)
      .post(`/join/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200, res.text);
      return chai.request(server.express)
      .post(`/addRobot/${gamekey}`)
      .set('Cookie', cookie);
    })
    .then(res => {
      //console.log(res.text);
      assert.equal(res.status, 200, res.text);
      // server.mail.transport hasn't been configured yet
      //server._debug = console.debug;
      let token;
      server.config.mail = {
        sender: "unit tests",
        transport: {
          sendMail: function(email) {
            assert.equal(email.from, "test_user<test@email.com>");
            assert.equal(email.to, "test@email.com");
            assert.equal(email.subject, Platform.i18n("email-remind"));
            assert(email.text);
            return Promise.resolve();
          }
        }
      };
      //server._debug = console.debug;
      // Because we haven't gone though playIfReady yet, the players
      // will still be in the order they were added i.e. human first
      return chai.request(server.express)
      .post(`/sendReminder/${gamekey}`)
      .send()
      .set('Cookie', cookie);
    })
    .then(res => {
      assert.deepEqual(res.body, ['test_user']);
      assert.equal(res.status, 200);
    });
  });
});
