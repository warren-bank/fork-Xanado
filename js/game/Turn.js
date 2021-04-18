/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

define("game/Turn", () => {
	/**
	 * Communicating the result of a move from server back to client
	 */

	class Turn {
		/**
		 * @param game the Game
		 * @param type type of turn e.g. 'move', 'pass' etc
		 * @param player the Player who invoked the action
		 * @param deltaScore change in score as a result of this turn
		 */
		constructor(game, type, player, deltaScore) {
			this.type = type;
			this.player = player.index;
			this.deltaScore = deltaScore;
			// info to update records on the client
			this.nextToGo = game.whosTurn;
			// Counts of tiles left in bag and on player racks after play
			// Assumes the Turn is constructed after the play is complete
			this.leftInBag = game.letterBag.remainingTileCount();
			this.onRacks = game.players.map(
				player => player.rack.squaresUsed());
		}
	}

	return Turn;
});
