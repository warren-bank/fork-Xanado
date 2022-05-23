/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env amd */

define("game/Notify", () => {

	/**
	 * Socket messgaes sent by the server and UI
	 */
	class Notify {
		/* Notifications intended for all listeners */
		static UNPAUSE      = "unpause";
		static PAUSE        = "pause";
		static JOIN         = "join";
		static REJECT       = "reject";
		static MESSAGE      = "message";
		static NEXT_GAME    = "nextGame";
		static ANOTHER_GAME = "anotherGame";
		static TICK         = "tick";
		static TURN         = "turn";
		static CONNECTIONS  = "connections";

		/* Notifications sent to monitors (games pages) */
		static UPDATE       = "update";
		static MONITOR      = "monitor";
	}

	return Notify;
});
