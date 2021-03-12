# Online multiplayer word grid game with HTML/JavaScript UI

This is a fork of [Hans Hübner's html-scrabble](https://github.com/hanshuebner/html-scrabble). For a history of the game, read his page. 

This version has been rewritten to use modern Javascript and updated
dependencies. It supports different board layouts and tile sets (indeed,
it's easy to define your own).

It also reinstates some of
[Daniel Weck's dictionary support](https://github.com/danielweck/scrabble-html-ui)
that was removed in html-scrabble. Dictionary supoport has been moved
server-side and made optional and less intrusive. Daniel's DAWG_Compressor
program is included complete, and can be used to create a DAWG (Directed Acyclic
Word Graph) from a word list. This can then be optionally linked in a game
to support a challenge. See the top of DAWG_Compressor.c for information on
running the compressor. `dict.js` can be used to explore the DAWG e.g.
```
node dict.js -a scrabble
```

Also included is a computer player, based on the work of [Elijah Sawyers](https://raw.githubusercontent.com/elijahsawyers/WordsWithFriendsHelper),
which is in turn based on the [work of Andrew W. Appel and Guy J. Jacobson](
https://www.cs.cmu.edu/afs/cs/academic/class/15451-s06/www/lectures/scrabble.pdf).

## Installing

Is the same as the original version, read that page.

## IMPORTANT NOTICES:

SCRABBLE® is a registered trademark. All intellectual property
rights in and to the game are owned in the U.S.A and Canada by
Hasbro Inc., and throughout the rest of the world by J.W. Spear &
Sons Limited of Maidenhead, Berkshire, England, a subsidiary of
Mattel Inc.

This not-for-profit project is not associated with any of the owners of the SCRABBLE® brand.

"Words With Friends" is the name of a game produced by Zynga Inc. To the best of our knowledge this is not a trademark.

This not-for-profit project is not associated with any of the owners of the Zynga brand.


