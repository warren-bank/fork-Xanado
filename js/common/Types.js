/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd */

/**
 * Grouping together typedefs. Purely for documentation, not used in code.
 */

/**
 * @typedef {object} BagLetter
 * An object that holds a letter, a score, and a count.
 * A {@linkcode LetterBag} is a set of BagLetter.
 * @param {string} BagLetter.letter - a code point (undefined for blank)
 * @param {number} BagLetter.score - score for this letter
 * @param {number} BagLetter.count - number of tiles for this letter
 */

/**
 * See {@linkcode https://nodejs.org/api/http.html|http.ServerRequest}
 * @typedef {http.ServerRequest} Request
 */

/**
 * See {@linkcode https://nodejs.org/api/http.html|http.ServerResponse}
 * @typedef {http.ServerResponse} Response
 */

/**
 * A 16-character key that uniquely identifies a player or a game.
 * @typedef {string} Key
 */

