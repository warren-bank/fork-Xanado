/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd */

define('game/Turn', ["game/Move"], Move => {

	/**
	 * Communicating the result of a command from server back to client,
	 * and in a game history. Despite the name, a Turn is used not just
	 * for a player's turn (such as a play or a swap) but also for other
	 * results from commands sent to the server, such as challenges.
	 */
	class Turn extends Move {
		/**
		 * @param {Game} game the Game
		 * @param {object} params parameters. Any field with the same name
		 * as a member (or a member of {@link Move}) will initialise
		 * that member.
		 */
		constructor(game, params) {
			super(params);

			/**
			 * Key of the game
			 * @member {string}
			 */
			this.gameKey = game.key;

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
			this.type = params.type;

			/**
			 * Key of the player who has been affected by the turn. Normally
			 * this is the player who made the Move that resulted in the Turn,
			 * but in the case of a challenge it is the player who was
			 * challenged.
			 * @member {string}
			 */
			this.playerKey = params.playerKey;

			/**
			 * Key of the next player who's turn it is
			 * @member {string}
			 */
			this.nextToGoKey = params.nextToGoKey;
			
			/**
			 * For 'challenge-won' and 'challenge-failed',
			 * the key of the player who challenged. playerkey in this case
			 * will be the player who's play was challenged (always the
			 * previous player)
			 * @member {string?}
			 */
			if (params.challengerKey)
				this.challengerKey = params.challengerKey;

			let ep = game.players.find(p => p.rack.isEmpty());
			/**
			 * Player who's rack has been left empty by the play that
			 * resulted in this turn
			 * @member {string?}
			 */
			if (ep)
				this.emptyPlayerKey = ep.key;

			/**
			 * String describing the reason the game ended. Only used when
			 * type=='Game over'
			 * @member {string?}
			 */
			if (params.endState)
				this.endState = params.endState;
		}
	}

	return Turn;
});
