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
