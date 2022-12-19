/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env node, mocha */
/*global document:writable*/

import { Edition } from "../../js/game/Edition.js";
import { BackendGame } from "../../js/backend/BackendGame.js";

const Square = BackendGame.CLASSES.Square;
const Tile = BackendGame.CLASSES.Tile;
const Board = BackendGame.CLASSES.Board;

/**
 * Unit tests for BackendBoard class
 */
describe("backend/BackendBoard", () => {

  function UNit() {}
  
  it("scorePlay", () => {
    return Edition.load("Test")
    .then(edition => {
      let b = new Board(BackendGame.CLASSES, edition);
      for (let r = 0; r < b.rows; r++)
        for (let c = 0; c < b.cols; c++)
          assert(!b.touchingOld(r, c));
      const mr = Math.floor(b.rows / 2);
      const mc = Math.floor(b.cols / 2);
      
      const W = new Tile({letter: "W", score:4});
      const O = new Tile({letter: "O", score:1});
      const R = new Tile({letter: "R", score:2, isBlank:true});
      const D = new Tile({letter: "D", score:3});
      // Q_________Q
      // _q_______q_
      // __T_____T__
      // ___t___t___
      // ____d_d____
      // _____WORD__
      // ____d_d____
      // ___t___t___
      // __T_____T__
      // _q_______q_
      // Q_________Q
      let w0 = [];
      let g0 = b.scorePlay(mc+3, mr, 1, 0, [ W, O, R, D ], w0);
      assert.deepEqual(w0, [{ word: "WORD", score: 20 } ]);
      assert.equal(g0, 20);

      // Lock down the play
      b.at(mc, mr).placeTile(W, true);
      b.at(mc+1, mr).placeTile(O, true);
      R.letter = "R";
      b.at(mc+2, mr).placeTile(R, true);
      b.at(mc+3, mr).placeTile(D, true);

      // Score another play that extends the existing word
      const S = new Tile({letter: "S", score: 1});
      const U = new Tile({letter: "U", score: 1});
      const N = new Tile({letter: "N", isBlank:true, score: 2});

      // Q_________Q
      // _q_______q_
      // __T_____T__
      // ___t___t___
      // ____d_d____
      // ____SWORD__
      // ____U_d____
      // ___tN__t___
      // __T_____T__
      // _q_______q_
      // Q_________Q
      const w1 = [];
      const g1 = b.scorePlay(mc - 1, mr + 2, 0, 1, [ S, U, N ], w1);
      assert.deepEqual(w1, [
        { word: "SWORD", score: 11 },
        { word: "SUN", score: 5 } ]);
      assert.equal(g1, 16);
      
      b.at(mc-1, mr).placeTile(S, true);
      b.at(mc-1, mr + 1).placeTile(U, true);
      b.at(mc-1, mr + 2).placeTile(N, true);

      // Score another play that intersects the existing word
      const I = new Tile({letter: "I", score: 1});
      const C = new Tile({letter: "C", score: 2});
      const K = new Tile({letter: "K", score: 2});

      // Q_________Q
      // _q_______q_
      // __T_____T__
      // ___t___t___
      // ____d_d____
      // ____SWORD__
      // ____U_d_I__
      // ___tN__tC__
      // __T_____K__
      // _q_______q_
      // Q_________Q
      const w2 = [];
      const g2 = b.scorePlay(mc+3, mr+3, 1, 0, [ D, I, C, K ], w2);
      assert.deepEqual(w2, [ { word: "DICK", score: 24 } ]);
      assert.equal(g2, 24);

      //console.log(b.stringify());
    });
  });
});
