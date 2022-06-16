/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

define("game/Types", () => {

    /**
     * See {@link https://nodejs.org/api/http.html|http.ServerRequest}
     * @typedef {http.SereverRequest} Request
     */

    /**
     * See {@link https://nodejs.org/api/http.html|http.ServerResponse}
     * @typedef {http.ServerResponse} Response
     */

    /**
     * A 16-character key that uniquely identifies a player or a game.
     * @typedef {string} Key
     */

    /**
     * Game states.
     * * WAITING - until enough players join the game
	 * * PLAYING - until the game is over, then
	 * * GAME_OVER - game was played to end, or
	 * * TWO_PASSES - all players passed twice, or
	 * * FAILED_CHALLENGE - a challenge on the final play failed
     * * TIMED_OUT - game is too old, will be pruned
     * @typedef {WAITING|PLAYING|GAME_OVER|TWO_PASSES|FAILED_CHALLENGE|TIMED_OUT} State
     */
    const State = {
 		WAITING:          /*i18n*/"Waiting for players",
		PLAYING:          /*i18n*/"Playing",
		GAME_OVER:        /*i18n*/"Game over",
		TWO_PASSES:       /*i18n*/"All players passed twice",
		FAILED_CHALLENGE: /*i18n*/"Challenge failed",
		TIMED_OUT:        /*i18n*/"Timed out"
    };
 
	/**
     * Commands that can be sent from the UI to the Server.
     * @typedef {UNPAUSE|PAUSE|CHALLENGE|PLAY|TAKE_BACK|PASS|GAME_OVER|SWAP} Command
	 */
    const Command = {
		PLAY:              "play",
		CHALLENGE:         "challenge",
		PASS:              "pass",
		SWAP:              "swap",
		TAKE_BACK:         "takeBack",
		PAUSE:             "pause",
		UNPAUSE:           "unpause",
		CONFIRM_GAME_OVER: "confirmGameOver"
	};

	/**
	 * Notifications intended for all listeners
     * @typedef {UNPAUSE|PAUSE|JOIN|REJECT|MESSAGE|NEXT_GAME|ANOTHER_GAME|TICK|TURN|CONNECTIONS|UPDATE|MONITOR} Notify
	 */
    const Notify = {
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
    };

    /**
     * Types of game timer
     * * NONE - game is untimed
     * * TURN - each turn is time-limited
     * * GAME - game is time limited, and a points penalty is applied for overtime
     * @typedef {NONE|TURN|GAME} Timer
     */
    const Timer = {
	    NONE:  /*i18n*/"No timer",
	    TURN:  /*i18n*/"Turn timer",
	    GAME:  /*i18n*/"Game timer"
    };

    /**
	 * Different types of penalty for a failed challenge.
     * * NONE - no penalty
     * * MISS - challenging player misses next turn
     * * PER_TURN - challenger loses a fixed number of points
     * * PER_WORD - challenger loses points for each wrongly challenged word
     * @typedef {NONE|MISS|PER_TURN|PER_WORD} Penalty
     */
    const Penalty = {
		NONE:     /*i18n*/"No penalty",
		MISS:     /*i18n*/"Miss next turn",
		PER_TURN: /*i18n*/"Lose points",
		PER_WORD: /*i18n*/"Lose points per word"
    };

    /**
     * Different types of {@link Turn}
	 * * PLAY - some tiles were placed on the board
	 * * SWAP - player swapped for fresh tiles from the bag
	 * * GAME_OVER - game is over
	 * * CHALLENGE_LOST - player challenged, and lost
	 * * CHALLENGE_WON - player challenged, and won
	 * * TOOK_BACK - player took back their play
	 * * PASSED - player passed
	 * * TIMED_OUT - player was timed out (if {@link Timer{ type is 'TURN')
     * @typedef {PLAY|SWAP|GAME_OVER|CHALLENGE_LOST|CHALLENGE_WON|TOOK_BACK|PASSED|TIMED_OUT} Turns
     */
    const Turns = {
		PLAY:           "play",
		SWAP:           "swap",
		GAME_OVER:      "game-over",
		CHALLENGE_LOST: "challenge-lost",
		CHALLENGE_WON:  "challenge-won",
		TOOK_BACK:      "took-back",
		PASSED:         "passed",
		TIMED_OUT:      "timed-out"
    };

    /**
     * Ways to check played words.
     * * NONE - don't check played words
     * * AFTER - report to player (only) if played words were in dictionary
     * * REJECT - refuse to accept words not in the dictionary. A bad play 
     *   in this case does not result in a penalty, it just won't accept
     *   the play.
     * @typedef {NONE|AFTER|REJECT} WordCheck
     */
    const WordCheck = {
		NONE:    /*i18n*/"Don't check words",
		AFTER:   /*i18n*/"Check words after play",
		REJECT:  /*i18n*/"Reject unknown words"
    };

    // ordered types for <select> in UI
	Timer._types = [
        Timer.NONE, Timer.TURN, Timer.GAME
	];

    Penalty._types = [
		Penalty.PER_WORD, Penalty.PER_TURN,
		Penalty.MISS, Penalty.NONE
	];

    WordCheck._types = [
		WordCheck.NONE, WordCheck.AFTER, WordCheck.REJECT
    ];

    return {
        State: State,
        Command: Command,
        Notify: Notify,
        Timer: Timer,
        Penalty: Penalty,
        Turns: Turns,
        WordCheck: WordCheck
    };
});
