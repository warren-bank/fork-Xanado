/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env amd */

define("game/Types", () => {

	/**
	 * Commands recognised by the /command route in {@link Server}
	 */
	const Types = {
        State: {
 		    WAITING:          /*i18n*/"Waiting for players",
		    PLAYING:          /*i18n*/"Playing",
		    GAME_OVER:        /*i18n*/"Game over",
		    TWO_PASSES:       /*i18n*/"All players passed twice",
		    CHALLENGE_FAILED: /*i18n*/"Challenge failed",
		    TIMED_OUT:        /*i18n*/"Timed out"
        },
 
        Command: {
		    UNPAUSE:   "unpause",
		    PAUSE:     "pause",
		    CHALLENGE: "challenge",
		    PLAY:      "play",
		    TAKE_BACK: "takeBack",
		    PASS:      "pass",
		    GAME_OVER: "confirmGameOver",
		    SWAP:      "swap"
	    },

        Notify: {
		    /* Notifications intended for all listeners */
		    UNPAUSE:      "unpause",
		    PAUSE:        "pause",
		    JOIN:         "join",
		    REJECT:       "reject",
		    MESSAGE:      "message",
		    NEXT_GAME:    "nextGame",
		    ANOTHER_GAME: "anotherGame",
		    TICK:         "tick",
		    TURN:         "turn",
		    CONNECTIONS:  "connections",

		    /* Notifications sent to monitors (games pages) */
		    UPDATE:       "update",
		    MONITOR:      "monitor",
        },

        Timer: {
		    /**
		     * No timer.
		     * @member {string}
		     */
	        NONE:  /*i18n*/"No timer",

		    /**
		     * Time limit on each turn. `clock` is the number of seconds
             * left for player to make their turn.
		     * @member {string}
		     */
	        TURN:  /*i18n*/"Turn timer",

		    /**
		     * Chess clock, timing the whole game. `clock` increments while
             * it is player's turn.
		     * @member {string}
		     */
	        GAME:  /*i18n*/"Game timer"
        },

        Penalty: {
		    // Valid values for 'penaltyType'. Values are used in UI
		    NONE:     /*i18n*/"No penalty",
		    MISS:     /*i18n*/"Miss next turn",
		    PER_TURN: /*i18n*/"Lose points",
		    PER_WORD: /*i18n*/"Lose points per word"
        },

        TurnType: {
        },

        WordCheck: {
		    NONE:    /*i18n*/"Don't check words",
		    AFTER:   /*i18n*/"Check words after play",
		    REJECT:  /*i18n*/"Reject unknown words"
        }
    };

    // Timer types
	Types.Timer._types = [
        Types.Timer.NONE, Types.Timer.TURN, Types.Timer.GAME
	];

	// Failed challenge penalty options for UI
    Types.Penalty._types = [
		Types.Penalty.PER_WORD, Types.Penalty.PER_TURN,
		Types.Penalty.MISS, Types.Penalty.NONE
	];

	// Word check types for UI
    Types.WordCheck._types = [
		Types.WordCheck.NONE, Types.WordCheck.AFTER, Types.WordCheck.REJECT
    ];

    return Types;
});
