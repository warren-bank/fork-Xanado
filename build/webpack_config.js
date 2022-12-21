// Base webpack config, shared by all packed modules
import path from "path";
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import TerserPlugin from "terser-webpack-plugin";
import webpack from "webpack";

const node_modules = {
  "@cdot/cbor": "@cdot/cbor/dist/mjs/index.js",
//  "@cdot/cbor": "@cdot/cbor/src/CBOR.js",
  "@cdot/dictionary": "@cdot/dictionary/dist/mjs/index.js",
  "jquery": "jquery/dist/jquery.js",
  "jquery-ui": "jquery-ui/dist/jquery-ui.js",
  "jquery.i18n": "@wikimedia/jquery.i18n/src/jquery.i18n.js",
  "i18n.emitter": "@wikimedia/jquery.i18n/src/jquery.i18n.emitter.js",
  "i18n.fallbacks": "@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks.js",
  "i18n.language": "@wikimedia/jquery.i18n/src/jquery.i18n.language.js",
  "i18n.messagestore": "@wikimedia/jquery.i18n/src/jquery.i18n.messagestore.js",
  "i18n.parser": "@wikimedia/jquery.i18n/src/jquery.i18n.parser.js",
  "touch-punch": "@rwap/jquery-ui-touch-punch/jquery.ui.touch-punch.js",
  "socket.io": "socket.io/client-dist/socket.io.js",
  "cookie": "jquery.cookie/jquery.cookie.js",
  "cldrpluralruleparser": "@wikimedia/jquery.i18n/libs/CLDRPluralRuleParser/src/CLDRPluralRuleParser.js"
};

const importMap = {};
for (const k of Object.keys(node_modules)) {
  importMap[k] = path.resolve(
    __dirname, "..", "node_modules", node_modules[k]);
}

function makeConfig(input, output) {
  return {
    entry: `${__dirname}/../src/${input}`,
    mode: "production",
    output: {
      filename: output,
      path: `${__dirname}/../dist`,
      globalObject: "this"
    },
    resolve: {
      extensions: [ '.js' ],
      alias: importMap
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            // We have to keep class names because CBOR TypeMapHandler
            // uses them
            keep_classnames: true
          },
        }),
      ]
    },
    plugins: [
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery'
      })
    ]
  };
}

export { makeConfig }
