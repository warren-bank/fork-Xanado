/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env amd */

define("game/Turn", ["game/Move"], Move => {

	/**
	 * Communicating the result of a command from server back to client,
	 * and in a game history. Despite the name, a Turn is used not just
	 * for a player's turn (such as a play or a swap) but also for other
	 * results from commands sent to the server, such as challenges.
	 */
	class Turn extends Move {

		/* Turn types */
		static PLAY           = "play";
		static SWAP           = "swap";
		static GAME_OVER      = "game-over";
		static CHALLENGE_LOST = "challenge-lost";
		static CHALLENGE_WON  = "challenge-won";
		static TOOK_BACK      = "took-back";
		static PASSED         = "passed";
		static TIMED_OUT      = "timed-out";
		
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
			 * The 'type' of the turn. This will be a Turn.* constant
			 * constants.
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
			 * For `Turn.CHALLENGE_WON` and `Turn.CHALLENGE_LOST`,
			 * the key of the player who challenged. playerkey in this case
			 * will be the player who's play was challenged (always the
			 * previous player)
			 * @member {string?}
			 */
			if (params.challengerKey)
				this.challengerKey = params.challengerKey;

			let ep = game.getPlayers().find(p => p.rack.isEmpty());
			/**
			 * Player who's rack has been left empty by the play that
			 * resulted in this turn
			 * @member {string?}
			 */
			if (ep)
				this.emptyPlayerKey = ep.key;

			/**
			 * String describing the reason the game ended. Only used when
			 * type==Turn.GAME_OVER
			 * @member {string?}
			 */
			if (params.endState)
				this.endState = params.endState;
		}
	}

	return Turn;
});
