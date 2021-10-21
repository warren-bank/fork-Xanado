# Code structure

The installation has subdirectories as follows:
* `audio` contains audio samples
* `css` contains style sheets
* `dictionaries` contains all the dictionaries
* `editions` contains the edition specifications
* `games` contains the database of games
* `html` has the html for the user interfaces, `games.html` for the control panel, `createGame.html` for the new game page, and `game.html` for the game itself.
* `i18n` contains the master English `en.json` and any other contributed translations of the interface.
* `images` contains images used by the game
* `js` has all the source code
	* `js/browser` is the browser code
	* `js/dawg` is generation and management of DAWGs
	* `design` is the valett program
	* `game` has the platform-independent game engine
	* `i18n` has the translations checker
	* `server` has the node.js server code

# Flow of Control

A game is joined by opening a server URI which identifies the game
and player (`GET /game/gameKey/playerKey`) that this Ui will play. 

The response to this request includes a cookie that identifies the
gameKey and playerKey for future requests, and redirects to
`/game/gameKey`. The handler for this request recognises that the
browser is asking for HTML and serves up `/html/game.html`, which
loads the UI. When the document is ready, it executes `/js/game.js`,
which instantiates an object of the `Ui` class after URL parameters
have been analysed by the helper `js/browser/browserApp.js`.

Construction of the Ui object asks the server for the state of the
game using a `GET /game/gameKey` URI. The server recognises this as a
request for JSON, and serves up the game, as serialised by
`js/game/Freeze.js`.  The UI thaws this data and loads the game, then
manually connects the `WebSocket`, attaching handlers for managing the
socket (see Ui.attachSocketListeners).  These include handlers
for custom events `turn`, `tick`, `gameOverConfimed`, `nextGame`,
`message`, and `connections`, that the server will send. With the
exception of `message` these are all broadcast events, sent to all
players.
 
Once construction is complete, the Ui will listen for events coming
from the server and modify the Ui accordingly. It will also listen
for events coming from the user. At points it will POST messages to the
server to reflect user actions: `makeMove`, `challenge`,
`swap`, `takeBack`, and `pass`. The server will pass these on to
`js/game/Game.js` for handling.

# Documentation

The code is documented using `jsdoc`. The `Makefile` at the root has a
`doc` target that will generate the documentation in the `doc` subdirectory.
You can read the doc in a browser by opening `file:///..../doc/index.html`
or, if the game server is running, by loading `http://localhost:9093/doc/index.html` (adjust URL to suit your install)
