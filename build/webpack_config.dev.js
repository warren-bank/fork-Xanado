import path from "path";
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import webpack from "webpack";

export default {
  entry: {
    "StandaloneGamesUI": {
      import: `${__dirname}/../src/standalone/StandaloneGamesUI.js`,
      filename: "dist/standalone/StandaloneGamesUI.js"
    },
    "StandaloneGameUI": {
      import: `${__dirname}/../src/standalone/StandaloneGameUI.js`,
      filename: "dist/standalone/StandaloneGameUI.js"
    },
    "ClientGamesUI": {
      import: `${__dirname}/../src/client/ClientGamesUI.js`,
      filename: "dist/client/ClientGamesUI.js"
    },
    "ClientGameUI": {
      import: `${__dirname}/../src/client/ClientGameUI.js`,
      filename: "dist/client/ClientGameUI.js"
    }
  },
  mode: 'development',
  target: ['web'],
  devtool: 'source-map',
  cache: true,
  resolve: {
    extensions: [ '.js' ]
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify('development')
      }
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    })
  ],
  devServer: {
    server: 'http',
    host: '0.0.0.0',
    port: 9094,
    hot: false,
    liveReload: true,
    static: false,
    devMiddleware: {
      index: false,
    },
    proxy: {
      context: () => true,
      target: 'http://localhost:9093',
    },
    client: {
      progress: true,
      reconnect: true
    },
    open: false
  }
}
