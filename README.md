# Multiplayer word grid game server and interface

While there are a number of public servers out there offering clones of the classic SCRABBLE® game, they are limited in a number of ways:
* Their source code is not public, and setting up your own server is not an option.
* They are generally limited to a single version of the game.
* Their dictionaries are usually based on the standard Scrabble SOWPODS dictionary, which is stuffed full of obscure American English words that only a Scrabble afficionado will know. This makes the game inaccessible for casual players, and those wishing to play in non-English languages.
* They plague you with tedious advertisements.

I wanted a game I could host on my own server, and experiment with different
dictionaries, board layouts, tile sets, and rule combinations.

A further application that has emerged is as an entertaining teaching aid
for langauge learners. Included is a dictionary based on the Oxford 5000 most
important words to learn in English. By playing the game against the robot,
learners are exposed to new words that they can then seek the definition of.

## History
This is a fork of [Hans Hübner's html-scrabble](https://github.com/hanshuebner/html-scrabble). I started working on their code but rapidly realised it required a fork, rather than bothering them with hundreds of pull requests.

This version has some major differences:
* It has been rewritten to use Javascript ES6 and updated dependencies. It supports different board layouts and tile sets, and makes it easy to define your own.
* It reinstates some of [Daniel Weck's dictionary support](https://github.com/danielweck/scrabble-html-ui) that was not used in html-scrabble. Dictionaries have been moved server-side and made optional, and integrated into gameplay. New dictionaries are easy to generate from word lists.
* It adds a computer player, inspired by the work of [Elijah Sawyers](https://raw.githubusercontent.com/elijahsawyers/WordsWithFriendsHelper) (which is in turn based on the [work of Andrew W. Appel and Guy J. Jacobson](https://www.cs.cmu.edu/afs/cs/academic/class/15451-s06/www/lectures/scrabble.pdf)). The player is stupid, simply selecting the highest scoring play it can in the time allowed for its move. However this is more than enough to beat most human players.
* The UI has been fixed and massaged to make it more mobile device friendly.

# Installation

The code is written in Javascript ES6 and tested using `node.js` version 11.15.0. You will require this or a more recent version of `node.js`. The client runsin a browser and works on all the browsers I tested (Chrome, Firefox, Android.)

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

# Usage
Normally one player will act as the host, and create a new game
on the games page. Once a game has been created, other players either
follow the link in email or click on their name in the games page to
join the game. The game interface is fairly self explanatory if you
know the [rules of Scrabble](https://www.officialgamerules.org/scrabble).
The game starts with a randomly selected player.

As many players as you like can be robots, but you need at least one human player (otherwise, what's the point?)

The installation comes with emulations of a number of commercially available
games - SCRABBLE®, Super SCRABBLE®, Lexulous, and Words With Friends.
Guidance for creating your own custom game is given below.

# Dictionaries
The `/dictionaries` directory contains all the
dictionaries. Included with the installation are 4 pre-built dictionaries:
* SOWPODS_English - 409K words from an [unofficial version](https://www.wordgamedictionary.com/sowpods/download/sowpods.txt) of the standard European English SCRABBLE® dictionary.
* German - the word list from the [germandict project on Sourceforge](https://sourceforge.net/projects/germandict/files/). 404K words.
* British_English - a custom British English dictionary, designed for casual players, to reflect the average vocabulary of a university-educated Briton. Note that many American word spellings are also included, to reflect the flexible nature of our shared language. 66K words.
* Oxford_5000 - 28K words derived from the [Oxford Learner's Dictionary](https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000)

## Building your own dictionary

Dictionaries are stored in the `dictionaries` directory in the form of
a DAWG (Directed Acyclic Word Graph), which is generated from a
lexicon (list of words) using a processor based on [Daniel Weck's
DAWG_Compressor program](https://github.com/danielweck/scrabble-html-ui). To build a new dictionary, follow the
instructions given when you run:
```
$ node js/dawg/compressor.js
```
`js/dawg/explore.js` can be used to explore the generated DAWG(s) e.g.
```
$ node js/dawg/explore.js SOWPODS_English --anagrams scrabble
```
Run it with no parameters for help.

# Designing your own game
Game definitions can be found in the `/editions` directory. Each
definition describes the layout of the lower-right quadrant of the
board (it is assumed to be mirrored), the contents of the bag, the
number of tiles on the rack, the number of tiles that can be swapped
in a play, and the bonuses for playing certain numbers of tiles in one
play.

## Valett
Choosing point values for tiles, and the number of tiles of each letter,
can be difficult to get right. Included is a version of
[Joshua Lewis' Valett program](https://github.com/jmlewis/valett)
which analyses a word corpus and recommends tile values and counts for the
letter combinations encountered in the corpus based on probability (the corpus
can be any big list of words, or it can simply be a lexicon).

## Challenges
Currently only [double challenge](https://en.wikipedia.org/wiki/Challenge_(Scrabble)) is supported. An extension would be to support other challenge types.

# Internationalisation
The UI uses the [Wikimedia jQuery.i18n framework](https://github.com/wikimedia/jquery.i18n) to support translations. Currently translation files are provided for English and (a poor translation to) French. To generate your own translation, copy `/i18n/en.json` to a file using your language code (e.g. `de` for German) and edit the new file to provide the translation. If you do create a translation, please feel free to issue a pull request to get it into the source code.

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
