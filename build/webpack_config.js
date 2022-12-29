// Base webpack config, shared by all packed modules
import path from "path";
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import TerserPlugin from "terser-webpack-plugin";
import webpack from "webpack";
import { promises as fs } from "fs";

function makeConfig(html, js) {

  fs.readFile(`${__dirname}/../html/${html}`)
  .then(content => {
    content = content.toString().replace(
      /(<script type="module" src=").*?"/,
      `$1${js}"`);
    return fs.writeFile(`${__dirname}/../dist/${html}`, content);
  });

  return {
    entry: {
      app: `${__dirname}/../src/${js}`
    },
    //mode: "production",
    mode: "development",
    output: {
      filename: js,
      path: `${__dirname}/../dist`,
      globalObject: "window"
    },
    resolve: {
      extensions: [ '.js' ]
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
