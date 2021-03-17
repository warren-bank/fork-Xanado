# Online multiplayer word grid game with HTML/JavaScript UI

This is a fork of [Hans Hübner's html-scrabble](https://github.com/hanshuebner/html-scrabble). For a history of the game, read his page. 

This version has been rewritten to use modern Javascript and updated
dependencies. It supports different board layouts and tile sets, and makes it easy to define your own.

It also reinstates some of
[Daniel Weck's dictionary support](https://github.com/danielweck/scrabble-html-ui)
that was removed in html-scrabble. Dictionaries have been moved
server-side and made optional and less intrusive. New dictionaries are easy to generate from word lists.

Also included is a computer player, based on the work of [Elijah Sawyers](https://raw.githubusercontent.com/elijahsawyers/WordsWithFriendsHelper),
which is in turn based on the [work of Andrew W. Appel and Guy J. Jacobson](
https://www.cs.cmu.edu/afs/cs/academic/class/15451-s06/www/lectures/scrabble.pdf).

## Installation

Most code is written in Javascript and tested using `node.js` version 11.15.0.

First use `git clone` to clone the repository to your local machine. Then in
the root directory of the distribution
```
$ npm install
```
to install dependencies.

Settings can be be changed by the way of a configuration file which must be named `config.json` and placed in the root directory. A template configuration file is included in `config-default.json`. It can be copied to `config.json` and edited.

Once you have a suitable configuration, run the server using
```
$ node server.js
```
You can then visit the games page at `http://localhost:9093`.

If you want the server to send out email invitations, you should refer to the `nodemailer` documentation for information on how to configure it.

Note the `editions` directory, which contains all the templates for the different game boards, and `dictionaries` which contains all the DAWGs for the dictionaries.

## Usage

Normally one player will act as the game host, and create a new game on the games page. Once a game has been created, other players either follow the link in email or click on their name in the games page to join the game. The game interface is fairly self explanatory if you know the [rules of Scrabble](https://www.officialgamerules.org/scrabble). The game always starts with the first player in the list.

Any player named `robot<N>` (where `<N>` is a number will be played by the computer player.) Note that the computer player requires a dictionary, and is very hard to beat!

## Building Dictionaries

Dictionaries are stored in the form of a DAWG (Directed Acyclic Word Graph) which is generated from a lexicon (list of words) using a Javascript version of Daniel Weck's DAWG_Compressor program. To build a new dictionary, follow the instructions given when you run
```
$ node DAWG_Compressor.js
```
Another program, `dict.js` can be used to explore the DAWG e.g.
```
$ node dict.js --dict dictionaries/SOWPODS_English.dict --anagrams scrabble
```
run it with no parameters for help.

## IMPORTANT NOTICES:

SCRABBLE® is a registered trademark. All intellectual property
rights in and to the game are owned in the U.S.A and Canada by
Hasbro Inc., and throughout the rest of the world by J.W. Spear &
Sons Limited of Maidenhead, Berkshire, England, a subsidiary of
Mattel Inc.

This not-for-profit project is not associated with any of the owners of the SCRABBLE® brand.

"Words With Friends" is the name of a game produced by Zynga Inc. To the best of our knowledge this is not a trademark.

This not-for-profit project is not associated with any of the owners of the Zynga brand.


