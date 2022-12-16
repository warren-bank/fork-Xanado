/**
 * requiresjs configuration for browser. This is used by the Xanado HTML
 * modules as follows:
 *
 * <script>
 *  const rjs_main = "module required as last step";
 * </script>
 * <script data-main="../js/browser/rjs_config.js" src="../node_modules/requirejs/require.js"></script>
 *
 * See the requirejs documentation for explanation of data-main
 */

/*global rjs_main*/

requirejs.config({
  // Make paths relative to the location of the HTML.
  baseUrl: "..",

  // Disable caching when ?debug is in the URL args
  urlArgs: /[?;&]debug([=;&]|$)/.test(document.URL)
  ? `nocache=${Date.now()}`
  : "",

  // Be generous with  server latency
  waitSeconds: 60,

  // Note that we don't use any .min, because bin/build-dist.js
  // will minimise as necessary.
  paths: {
    jquery: "node_modules/jquery/dist/jquery",

    jqueryui: "node_modules/jquery-ui-dist/jquery-ui",

    "jquery.i18n": "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n",

    "i18n.emitter":
    "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.emitter",

    "i18n.fallbacks":
    "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks",

    "i18n.language":
    "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.language",

    "i18n.messagestore":
    "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.messagestore",

    "i18n.parser":
    "node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.parser",

    "touch-punch":
    "node_modules/jquery-ui-touch-punch/jquery.ui.touch-punch",

    "socket.io-client": "node_modules/socket.io/client-dist/socket.io",

    "cbor": "node_modules/@cdot/cbor/dist/index",

    "dictionary": "node_modules/@cdot/dictionary/dist/index",

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

  // shim specifies additional dependencies between modules
  shim: {
    "touch-punch":       [ "jquery" ],
    jqueryui:            [ "jquery" ],
    "jquery.i18n":       [ "jquery" ],
    "i18n.emitter":      [ "jquery.i18n" ],
    "i18n.fallbacks":    [ "jquery.i18n" ],
    "i18n.language":     [ "jquery.i18n", "common/pluralRuleParser" ],
    "i18n.messagestore": [ "jquery.i18n" ],
    "i18n.parser":       [ "jquery.i18n" ]
  }
});

// Require the module specified in the HTML by rjs_main
if (typeof rjs_main !== "undefined")
  requirejs([rjs_main]);
