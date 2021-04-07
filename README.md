# Online multiplayer word grid game with HTML/JavaScript UI

Why another Crossword game? For a number of reasons. While there are a number of public servers out there offering clones of, or alternatives to, the classic SCRABBLE® game, they are limited in a number of ways:
* Their source code is not public, and setting up your own server is not an option
* They are generally limited to a single version of the game
* Their dictionaries are usually based on the standard Scrabble SOWPODS dictionary, which is stuffed full of obscure American Emglish words that only a Scrabble afficionado will know. This makes the game inaccessible for casual players, and those wishing to play in non-English languages.

A further application of the game is as a teaching aid for langauge learners. Included is a dictionary based on the Oxford 5000 most important words to learn in English. By playing the game, learners are exposed to new words that they can then seek the definition of.

This is a fork of [Hans Hübner's html-scrabble](https://github.com/hanshuebner/html-scrabble). I started fixing his code but rapidly realised it required an awful lot of work, and made a fork to simplify that.

This version has some major differences from Hans'.
* It has been rewritten to use ES6 Javascript and updated dependencies. It supports different board layouts and tile sets, and makes it easy to define your own.
* It reinstates some of [Daniel Weck's dictionary support](https://github.com/danielweck/scrabble-html-ui) that was removed in html-scrabble. Dictionaries have been moved server-side and made optional and integrated into gameplay. New dictionaries are easy to generate from word lists. DAWGs have been extended to be bidirectional for best move computation.
* It adds a computer player, inspired by the work of [Elijah Sawyers](https://raw.githubusercontent.com/elijahsawyers/WordsWithFriendsHelper) (which is in turn based on the [work of Andrew W. Appel and Guy J. Jacobson](
https://www.cs.cmu.edu/afs/cs/academic/class/15451-s06/www/lectures/scrabble.pdf)). The player is stupid, simply selecting the highest scoring play it can in the time allowed for its move. However this is more than enough to beat most human players at Scrabble, Words with Friends, or Lexulous.
* The UI has been fixed and massaged to make it more mobile device friendly.

## Installation

The code is written in Javascript ES6 and tested using `node.js` version 11.15.0. You will require this or a more recent version of `node.js`

First use `git clone` to clone the repository to your local machine. Then in
the root directory of the distribution
```
$ npm install
```
to install dependencies.

You must create a configuration file named `config.json` and place it in the root directory. A template configuration file is included in `example-config.json`. It can be copied to `config.json` and edited as described in the file.

Once you have a suitable configuration, run the server using:
```
$ node server.js
```
You can then visit the games page at `http://localhost:9093`.

If you want the server to send out email invitations, you should refer to the `nodemailer` documentation for information on how to configure it.

Note the `/editions` directory, which contains all the templates for the different game boards, and `/dictionaries` which contains all the DAWGs for the dictionaries.

## Usage

Normally one player will act as the game host, and create a new game on the games page. Once a game has been created, other players either follow the link in email or click on their name in the games page to join the game. The game interface is fairly self explanatory if you know the [rules of Scrabble](https://www.officialgamerules.org/scrabble). The game starts with a randomly selected player.

As many players as you like can be robots, but you need at least one human player (otherwise, what's the point?)

## Building Dictionaries

Dictionaries are stored in the `dictionaries` directory in the form of a DAWG (Directed Acyclic Word Graph), which is generated from a lexicon (list of words) using a processor based on Daniel Weck's DAWG_Compressor program. To build a new dictionary, follow the instructions given when you run
```
$ node DAWG_Compressor.js
```
Another program, `dict.js` can be used to explore the DAWG e.g.
```
$ node dict.js --dict dictionaries/SOWPODS_English.dict --anagrams scrabble
```
Again, run it with no parameters for help.

## IMPORTANT NOTICES:

[SCRABBLE®](http://www.scrabble.com/) is a registered trademark. All intellectual property
rights in and to the game are owned in the U.S.A and Canada by
Hasbro Inc., and throughout the rest of the world by J.W. Spear &
Sons Limited of Maidenhead, Berkshire, England, a subsidiary of
Mattel Inc.

This not-for-profit project is not associated with any of the owners
of the SCRABBLE® brand.

["Words With Friends"](https://www.zynga.com/games/words-with-friends-2/)
is the name of an online game produced by Zynga Inc. To
the best of our knowledge this is not a registered trademark.

This not-for-profit project is not associated with any of the owners
of the Zynga brand.

"Lexulous" is the name of an online game hosted at
http://lexulous.com. To the best of our knowledge this is not a
registered trademark.

This not-for-profit project is not associated with any of the owners
of the Lexulous brand.

## COPYRIGHT AND LICENSE

This project is Copyright &copy; 2021 C-Dot Consultants. However it is
built on the work of many people, most notably Hans Hübner, Daniel
Weck, Elijah Swayers, Andrew Appel, and Guy Jacobsen, and the many
people who they in turn based their work on. All these individuals are
acknowledged as sharing the copyright to parts of the work.

The code is licensed under the terms of the [MIT license](https://en.wikipedia.org/wiki/MIT_License),
as the most restrictive of the licenses of the contributory works.
