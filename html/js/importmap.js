/*
 * -------------------------------------
 * https://caniuse.com/import-maps
 * -------------------------------------
 * requires:
 *   Chrome   89+
 *   Firefox 108+
 * -------------------------------------
 */

/*
 * -------------------------------------
 * grep
 * ====
 *   dir:   ../src
 *   regex: (?:import|from)\s+["'][^\.]
 * 
 * matches
 * =======
 * - search:  ^.*[/\\]server[/\\].*$
 *   replace: [empty]
 * - search:  ^.*(?:import|from)\s+["']+([^"']+).*$
 *   replace: $1
 * 
 * after sort and dedupe:
 * ======================
 * @cdot/cbor
 * @cdot/dictionary
 * @rwap/jquery-ui-touch-punch/jquery.ui.touch-punch.js
 * @wikimedia/jquery.i18n/src/jquery.i18n.emitter.js
 * @wikimedia/jquery.i18n/src/jquery.i18n.fallbacks.js
 * @wikimedia/jquery.i18n/src/jquery.i18n.js
 * @wikimedia/jquery.i18n/src/jquery.i18n.language.js
 * @wikimedia/jquery.i18n/src/jquery.i18n.messagestore.js
 * @wikimedia/jquery.i18n/src/jquery.i18n.parser.js
 * jquery-ui/dist/jquery-ui.js
 * jquery/dist/jquery.js
 * socket.io-client/dist/socket.io.esm.min.js
 * socket.io-client/dist/socket.io.js
 * socket.io/client-dist/socket.io.esm.min.js
 * web-worker
 * -------------------------------------
*/

{
  const im = document.createElement('script');
  im.type = 'importmap';
  im.textContent = JSON.stringify({
    "imports": {
      "@cdot/cbor":                                             "../node_modules/@cdot/cbor/dist/mjs/index.js",
      "@cdot/dictionary":                                       "../node_modules/@cdot/dictionary/dist/mjs/index.js",
      "@rwap/jquery-ui-touch-punch/jquery.ui.touch-punch.js":   "../node_modules/@rwap/jquery-ui-touch-punch/jquery.ui.touch-punch.js",
      "@wikimedia/jquery.i18n/src/jquery.i18n.emitter.js":      "../node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.emitter.js",
      "@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks.js":    "../node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks.js",
      "@wikimedia/jquery.i18n/src/jquery.i18n.js":              "../node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.js",
      "@wikimedia/jquery.i18n/src/jquery.i18n.language.js":     "../node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.language.js",
      "@wikimedia/jquery.i18n/src/jquery.i18n.messagestore.js": "../node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.messagestore.js",
      "@wikimedia/jquery.i18n/src/jquery.i18n.parser.js":       "../node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.parser.js",
      "jquery-ui/dist/jquery-ui.js":                            "../node_modules/jquery-ui/dist/jquery-ui.js",
      "jquery/dist/jquery.js":                                  "../node_modules/jquery/dist/jquery.js",
      "socket.io-client/dist/socket.io.esm.min.js":             "../node_modules/socket.io-client/dist/socket.io.esm.min.js",
      "socket.io-client/dist/socket.io.js":                     "../node_modules/socket.io-client/dist/socket.io.js",
      "socket.io/client-dist/socket.io.esm.min.js":             "../node_modules/socket.io/client-dist/socket.io.esm.min.js",
      "web-worker":                                             "../node_modules/web-worker/cjs/node.js"
    }
  }, null, 2);
  document.currentScript.after(im);
}
