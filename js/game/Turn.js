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
		 */
		constructor(game, members) {		
			/**
			 * The 'type' of the turn. This will be one of
			 * * `move`: a player has made a move
			 * * `swap`: a player has execute a tile swap
			 * * `Game over`: the end of the game has been confirmed
			 * * `challenge-failed`: a challenge was not successful
			 * * `challenge-won`: a challenge succeeded
			 * * `took-back`: the last player took back their turn
			 * @member {string}
			 */
			this.type = undefined;

			/**
			 * Key of the player who's turn it was
			 * @member {string}
			 */
			this.playerKey = undefined;

			/**
			 * Key of the next player who's turn it is
			 * @member {string}
			 */
			this.nextToGoKey = undefined;
			
			/**
			 * At the (possible) end of game, this will be the key of
			 * the player who has no tiles on their rack (and there are no
			 * more in the bag), or -1 if no player has an empty rack.
			 * @member {number}
			 */
			this.emptyPlayerKey = undefined;

			/**
			 * For 'took-back', 'challenge-won',
			 * key of the player who initiated the action
			 */
			this.challengerKey = undefined;

			/**
			 * For `move` it indicates the
			 * move. For `took-back` and `challenge-won` it is the
			 * move just taken back/challenged.
			 * @member {Tile[]}
			 */
			this.placements = undefined;

			/**
			 * Tiles replacing those just played.
			 * @member {Tile[]}
			 */
			this.replacements = undefined;
			
			/**
			 * Words just played, each {word: string, score: number}
			 * @member {object[]} 
			 */
			this.words = undefined;

			/**
			 * If a number, change in score for player as a result of
			 * this turn. If an object, change in score for each
			 * player, indexed by player key.
			 * @member {number|object}
			 */
			this.deltaScore = undefined;

			const ep = game.players.find(p => p.rack.isEmpty());
			if (ep)
				this.emptyPlayerKey = ep.key;

			if (members)
				Object.getOwnPropertyNames(members).forEach(
					prop => this[prop] = members[prop]);
		}
	}

	return Turn;
});
