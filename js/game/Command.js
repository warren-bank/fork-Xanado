/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env amd */

define("game/Command", () => {

	/**
	 * Commands recognised by the /command route in {@link Server}
	 */
	class Command {
		static UNPAUSE   = "unpause";
		static PAUSE     = "pause";
		static CHALLENGE = "challenge";
		static PLAY      = "play";
		static TAKE_BACK = "takeBack";
		static PASS      = "pass";
		static GAME_OVER = "confirmGameOver";
		static SWAP      = "swap";
	}

	return Command;
});
