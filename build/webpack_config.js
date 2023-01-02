// Base webpack config, shared by all packed modules
import path from "path";
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import TerserPlugin from "terser-webpack-plugin";
import webpack from "webpack";
import { promises as fs } from "fs";

function copyFile(from, to) {
  const a_from = path.normalize(path.join(__dirname, from));
  const a_to = path.normalize(path.join(__dirname, to));
  fs.cp(a_from, a_to, {
    recursive: true,
    force: true,
//    filter: f => { console.debug("copy", f); return true; },
    dereference: true
  })
  .catch(e => {
    // cp works, but throws all sorts of wierd errors for no
    // apparent reason before completing.
    //console.error("wierd", from, e);
  });
}

function relink(from, to, content) {
  const re = new RegExp(`(<link[^>]*href=")${from}`, "g");
  return content.replace(
    re,
    (m, preamble) => `${preamble}${to}`);
}

function makeConfig(html, js) {

  fs.readFile(`${__dirname}/../html/${html}`)
  .then(content => {
    content = content.toString();

    // Reroute the <script call to the main module.
    // There can be only one!
    content = content.replace(
      /(<script type="module" src=").*?([^/]+\/[^/]+.js")/,
      "$1../dist/$2");

    // Pull necessary CSS files out of node_modules; they may not be
    // installed on the target platform
    copyFile("../node_modules/normalize.css/normalize.css",
             "../dist/css/normalize.css");
    content = relink("../node_modules/normalize.css/normalize.css",
             "../dist/css/normalize.css",
            content);

    copyFile("../node_modules/jquery-ui/dist/themes",
             "../dist/css/themes");
    content = relink("../node_modules/jquery-ui/dist/themes",
            "../dist/css/themes",
            content);

    return fs.writeFile(`${__dirname}/../dist/${html}`, content);
  });

  return {
    entry: {
      app: `${__dirname}/../src/${js}`
    },
    mode: 'production',
    target: ['web', 'es5'],
    output: {
      filename: js,
      path: `${__dirname}/../dist`,
      globalObject: "window"
    },
    resolve: {
      extensions: [ '.js' ]
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { modules: false }],
              ],
              // plugin is needed to respect: webpackChunkName
              // see: https://github.com/babel/babel-loader/issues/592
              plugins: ['@babel/plugin-proposal-class-properties']
            }
          }
        }
      ]
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            // We have to keep class names because CBOR TypeMapHandler uses them
            keep_classnames: true
          },
        }),
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        "process.env": {
          NODE_ENV: JSON.stringify('production')
        }
      }),
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery'
      })
    ]
  };
}

export { makeConfig }
