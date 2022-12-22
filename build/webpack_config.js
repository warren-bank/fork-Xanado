// Base webpack config, shared by all packed modules
import path from "path";
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import TerserPlugin from "terser-webpack-plugin";
import webpack from "webpack";

const node_modules = {
  "@cdot/cbor": "@cdot/cbor/dist/mjs/index.js",
  "@cdot/dictionary": "@cdot/dictionary/dist/mjs/index.js"
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
