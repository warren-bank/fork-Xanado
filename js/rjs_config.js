// requiresjs configuration shared between all HTML
/*global rjs_main*/

requirejs.config({
  // Make paths relative to the location of the HTML.
  baseUrl: "..",

  // suppress browser cache when ?debug
  urlArgs: /[?;&]debug([=;&]|$)/.test(document.URL)
  ? `nocache=${Date.now()}` : "",

  waitSeconds: 60,
  paths: {
    jquery: "node_modules/jquery/dist/jquery.min",

    jqueryui: "node_modules/jquery-ui-dist/jquery-ui.min",

    "jquery.i18n": "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n",

    i18n_emitter:
    "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.emitter",

    i18n_fallbacks:
    "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks",

    i18n_language:
    "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.language",

    i18n_messagestore:
    "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.messagestore",

    i18n_parser:
    "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.parser",

    "touch-punch":
    "node_modules/jquery-ui-touch-punch/jquery.ui.touch-punch.min",

    "socket.io-client":
    "node_modules/socket.io/client-dist/socket.io",

    cookie:
    "node_modules/jquery.cookie/jquery.cookie",

    cldrpluralruleparser:
    "node_modules/@wikimedia/jquery.i18n/libs/CLDRPluralRuleParser/src/CLDRPluralRuleParser",

    editions: "editions",

    browser: "js/browser",
    backend: "js/backend",
    server: "js/server",
    client: "js/client",
    common: "js/common",
    dawg: "js/dawg",
    game: "js/game",
    platform: "js/browser/Platform",
    standalone: "js/standalone"
  },

  shim: {
    jqueryui: ["jquery"],
    "jquery.i18n": ["jquery"],
    i18n_emitter: ["jquery.i18n"],
    i18n_fallbacks: ["jquery.i18n"],
    i18n_language: ["jquery.i18n"],
    i18n_messagestore: ["jquery.i18n"],
    i18n_parser: ["jquery.i18n"],
    cldrpluralruleparser: {
      deps: [
        "jquery.i18n",
        "i18n_emitter",
        "i18n_fallbacks",
        "i18n_language",
        "i18n_messagestore",
        "i18n_parser"
      ]
    }
  }
});

if (typeof rjs_main !== "undefined")
  requirejs([rjs_main]);
