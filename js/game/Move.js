/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define("game/Move", [
    "game/Tile"
], Tile => {

	/**
	 * A Move is a collection of tile placements, and the delta score
	 * achieved for the move. We also record the words created by the
	 * move. It is used to send a human player's play to the server,
	 * which then sends a matching {@link Turn} to every player.
	 */
	class Move {

		/**
		 * Score for the play.
		 * If a number, change in score for the player as a result of
		 * this move. If an object, change in score for each
		 * player, indexed by player key. The object form is only used
		 * in Turn.
		 * @member {number|object}
		 */
        score;

		/**
		 * @param {(Move|object)?} params Move to copy, or params, or undefined
		 * Any member can be initialised by a corresponding field in
		 * params.
		 */
		constructor(params) {
			if (params.words)
		        /**
		         * List of words created by the play:
                 * ```
                 * { word: string, score: number }
		         * @member {object[]?}
		         */
				this.words = params.words;

			this.score = params ? (params.score || 0) : 0;

			if (params.placements)
		        /**
		         * List of tiles placed in this move. Tiles are required
		         * to carry col, row positions where they were placed.  In
		         * a Turn, for type=`move` it indicates the move. For
		         * `Turns.TOOK_BACK` and `Turns.CHALLENGE_WON` it is
		         * the move just taken back/challenged.
		         * @member {Tile[]?}
		         */
				this.placements = params.placements.map(
					tilespec => new Tile(tilespec));
		}

		/**
		 * Add a Tile placement to the move
		 * @param {Tile} tile the Tile to add
		 */
		addPlacement(tile) {
			if (this.placements)
				this.placements.push(tile);
			else
				this.placements = [tile];
		}

        /**
         * @override
         */
		toString() {
			const pl = this.placements.map(t => t.toString(true));
			const w = this.words.map(w => `${w.word}(${w.score})`);
			return `Play ${pl} words ${w} for ${this.score}`;
		}
	}

	return Move;
});
