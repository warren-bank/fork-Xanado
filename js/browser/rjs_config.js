// requiresjs configuration shared between all HTML
// Note that paths must be relative to the root of the distribution. Because of
// way requirejs works, that means this file also has to be in the root of the
// distribution.
// See https://coderwall.com/p/qbh0_w/share-requirejs-configuration-among-multiple-pages
/*global rjs_main*/

requirejs.config({
  baseUrl: "../..",
  waitSeconds: 60,
  paths: {
    jquery:               "/node_modules/jquery/dist/jquery.min",
    jqueryui:             "/node_modules/jquery-ui-dist/jquery-ui.min",
    "jquery.i18n":        "/node_modules/@wikimedia/jquery.i18n/src/jquery.i18n",
    i18n_emitter:         "/node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.emitter",
    i18n_fallbacks:       "/node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks",
    i18n_language:        "/node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.language",
    i18n_messagestore:    "/node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.messagestore",
    i18n_parser:          "/node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.parser",
    "touch-punch":        "/node_modules/jquery-ui-touch-punch/jquery.ui.touch-punch.min",
    "socket.io-client":   "/node_modules/socket.io/[..]/client-dist/socket.io",
    cookie:               "/node_modules/jquery.cookie/jquery.cookie",
    cldrpluralruleparser: "/node_modules/@wikimedia/jquery.i18n/libs/CLDRPluralRuleParser/src/CLDRPluralRuleParser",

    browser:  "js/browser",
    common:   "js/common",
    game:     "js/game",
    dawg:     "js/dawg",
    platform: "js/browser/Platform"
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
