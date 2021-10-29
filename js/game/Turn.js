/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

define('game/Turn', () => {

	/**
	 * Communicating the result of a move from server back to client
	 */
	class Turn {
		/**
		 * @param {Game} game the Game
		 * @param {Object} members object fields (members)
		 * @param {string} members.type The 'type' of the turn. This
		 * will be one of
		 * * `move`: a player has made a move
		 * * `swap`: a player has execute a tile swap
		 * * `ended-game-over`: the end of the game has been confirmed
		 * * `challenge-failed`: a challenge was not successful
		 * * `challenge-won`: a challenge succeeded
		 * * `took-back`: the last player took back their turn
		 * @param {number} members.player Index of the player who moved
		 * @param {number} members.nextToGo Index of the next player to play
		 * @param {number|number[]} members.deltaScore If a number,
		 * change in score for player as a result of this turn. If an
		 * array, change in score for each player.
		 * @param {Move} members.move For `move` it indicates the
		 * Move. For `took-back` and `challenge-won` it is the
		 * Move just taken back/challenged.
		 * @param {number} members.challenger For 'took-back', 'challenge-won',
		 * index of the player who initiated the action
		 */
		constructor(game, members) {		
			/**
			 * Index of the player who's turn it was
			 * @member {number}
			 */
			this.player = undefined;

			/**
			 * Count of tiles left in bag and on player racks after play
			 * @member {number}
			 */
			this.leftInBag = game.letterBag.remainingTileCount();

			/**
			 * At the (possible) end of game, this will be the index of
			 * the player who has no tiles on their rack (and there are no
			 * more in the bag), or -1 if no player has an empty rack.
			 * @member {number}
			 */
			const ep = game.players.find(p => p.rack.isEmpty());
			if (ep)
				this.emptyPlayer = ep.index;

			if (members)
				Object.getOwnPropertyNames(members).forEach(
					prop => this[prop] = members[prop]);
		}
	}

	return Turn;
});
