# Online multiplayer Scrabble with HTML/JavaScript UI

## History

This is a fork of https://github.com/hanshuebner/html-scrabble
For a history of the game, read that page. 

This version has been extensively refactored to use ES6 and update dependencies, as well as
fixing a number of minor bugs. This version also automatically scales the board and tile set
for numbers of players > 2. The boards generated follow the structure of Super Scrabble.

I have also reinstated some of Daniel Weck's dictionary support, though moved server-side
and made optional and less intrusive. Daniel's DAWG_Compressor program is included complete, and can be
used to create a DAWG (Directed Acyclic Word Graph) from a word list. This can then be optionally
linked in a game to support a challenge. See the top of DAWG_Compressor.c for information on running
the compressor. `dict.js` can be used to explore the DAWG e.g.
```
node dict.js -a scrabble
```

## Installing

Is the same as the original version, read that page.

## IMPORTANT COPYRIGHT NOTICE:

SCRABBLE® is a registered trademark. All intellectual property
rights in and to the game are owned in the U.S.A and Canada by
Hasbro Inc., and throughout the rest of the world by J.W. Spear &
Sons Limited of Maidenhead, Berkshire, England, a subsidiary of
Mattel Inc.

This not-for-profit project is not associated with any of the owners of the SCRABBLE® brand.
