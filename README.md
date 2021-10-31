# Multiplayer word grid game server and interface

Host your own server to play crossword games according to the rules of SCRABBLE®, Super SCRABBLE®, Words with Friends, and Lexulous. Or invent your own!
Has tile sets for English, French, German, Dutch, Czech, Estonian, and Hungarian, and has dictionaries in English, French, and German, and it's easy to add more.

<img src="/images/splash.png" width="265" height="300" alt="Board">

While there are a number of public servers out there offering clones of the classic SCRABBLE® game, I wanted a game I could host on my own server, and experiment with different
dictionaries, board layouts, tile sets, and rule combinations. And I wanted it
to be completely free. The public servers I found didn't work for me because:
* Their source code is not public, and setting up your own server is not an option.
* They are generally limited to a single version of the game.
* Their (English) dictionaries are usually based on the standard American Scrabble Tournament dictionary, which is stuffed full of obscure words that only a dedicated aficionado would know. This makes the games inaccessible for casual players, as a computer player will beat them every time.
* They plague you with tedious advertisements.

An interesting application that has emerged is as an entertaining teaching aid
for language learners. Included is a dictionary based on the Oxford 5000 most
important words to learn in English. By playing the game against the robot,
learners are exposed to new words that they can then seek the definition of.

## History

This is a fork of [Hans Hübner's html-scrabble](https://github.com/hanshuebner/html-scrabble). I
started working on their code but rapidly realised the scope and
number of changes I intended required a fork, rather than bothering
them with hundreds of pull requests.

This version has some major differences:
* It has been rewritten to use Javascript ES6 and the latest dependencies.
* It supports different board layouts and tile sets, and makes it easy to define your own.
* It reinstates some of [Daniel Weck's dictionary support](https://github.com/danielweck/scrabble-html-ui). Dictionaries have been moved server-side and made optional, and integrated into game play. New dictionaries are easy to generate from word lists.
* It adds a computer player, inspired by the work of [Elijah Sawyers](https://raw.githubusercontent.com/elijahsawyers/WordsWithFriendsHelper) (which is in turn based on the [work of Andrew W. Appel and Guy J. Jacobson](https://www.cs.cmu.edu/afs/cs/academic/class/15451-s06/www/lectures/scrabble.pdf)). The player is stupid, simply selecting the highest scoring play it can in the time allowed for its move. However this is more than enough to beat most human players.
* You can optionally play against the clock.
* The UI has been massaged to make it more mobile device friendly.
* Lots of bug fixes.

# Installation

## Using Docker
The simplest way to install the game is to use the latest Docker image, which you can find at https://github.com/cdot/CrosswordGame/pkgs/container/crosswordgame.
The Docker image takes care of all dependencies etc. for you.

## The Hard Way
The server code is written in Javascript ES6 and tested using `node.js` version 12.0.0. It may work in earlier versions of `node.js`, but is untested. The client runs in a browser and works on all the browsers I tested (Chrome, Firefox, Android, Opera.)

First use `git clone` to clone the repository to your local machine. Then in
the root directory of the distribution
```
$ npm install
```
to install dependencies.

You must create a configuration file named `config.json` and place it in the root directory.
A template configuration file is included in ['example-config.json'](example-config.json). It can be copied to `config.json` and edited as described in the file.

Once you have a suitable configuration, run the server using:
```
$ node server.js
```
You can then visit the games page at `http://localhost:9093`.

If you want the server to send out email invitations, you should refer to the `nodemailer` documentation for information on how to configure it.

## Playing with other people

If you want other internet users to access your game server, they have to be able to access a port on the server. If your server is already public
on the internet that's no problem, but if it is hidden away on your local area network, you may need to make it visible. Fortunately that's fairly
easy to do, and does not compromise security if it's done properly.
[This article](https://medium.com/botfuel/how-to-expose-a-local-development-server-to-the-internet-c31532d741cc) describes how.

# Usage

Normally one player will act as the host, and create a new game
on the games page. Once a game has been created, other players either
follow the link in email or click on their name in the games page to
join the game. The game interface is fairly self explanatory if you
know the [rules of Scrabble](https://www.officialgamerules.org/scrabble).
The game starts with a randomly selected player.

As many players as you like can be robots, but you need at least one
human player (otherwise, what's the point?)

The installation comes with emulations of a number of commercially available
games - SCRABBLE®, Super SCRABBLE®, Lexulous, and Words With Friends.
Guidance for creating your own custom game is given below.

## Interface

The user interface uses the mouse, or screen touches on mobile devices. Click the mouse on a letter in the rack and drag it to the board position where you want to drop it.

You can also use the keyboard for rapid word entry.
* Click on any empty square on the board (or type `*`) and a "typing cursor" will appear, pointing right ⇒
* Click again (or hit the spacebar) and it will turn to point down ⇓
* Each letter from the rack that you type on the keyboard will be picked and placed, and the typing cursor moved right or down depending on the direction of the typing cursor.
* If you type a letter that isn't on the rack, but you have a blank tile, then the blank will be used for that letter.
* Use Backspace or Delete to put the letter behind the typing cursor back on the rack.
* When the typing cursor is displayed, you can also use the arrow keys to move it around the board.
* You can still use the mouse while the typing cursor is visible.

There are also a number of other keyboard shortcuts for the various buttons:
* The `End` key will make the current move.
* The `Home` key will take back placed tiles.
* `@` will shuffle the rack.
* `?` will pass the current turn.
* `!` will take back your last move, or challenge the last player's move, depending on what the log says.

## Learning
To assist learners, there are two special 'chat' messages that can be entered.
* `hint` tells you the highest scoring play the computer can find for you, before your play. Everyone in the game is told when you send this message (to prevent cheating.)
* `advise` will turn on/off post-play analysis. This will suggest an alternative, higher-scoring play, if one exists, that you could have played.

# Dictionaries
The `/dictionaries` directory contains all the
dictionaries. Included with the installation are 4 pre-built dictionaries:
* `SOWPODS_English` - 409K words from an [unofficial version](https://www.wordgamedictionary.com/sowpods/download/sowpods.txt) of the standard European English SCRABBLE® competition dictionary.
* `German` - 404k word list from the [germandict project on Sourceforge](https://sourceforge.net/projects/germandict/files/).
* `British_English` - a custom 66k word British English dictionary, designed for casual players, to reflect the average vocabulary of a university-educated Briton. Note that many American word spellings are also included, to reflect the flexible nature of our shared language.
* `ODS8_French` - 411k word French SCRABBLE® competition dictionary.
* `Oxford_5000` - 28K words derived from the [Oxford Learner's Dictionary](https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000)

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
can be any big list of words, or it can simply be a lexicon). Run the program
`node js/design/valett.js` for help.

## Challenges
Currently only [double challenge](https://en.wikipedia.org/wiki/Challenge_(Scrabble)) is supported. An extension would be to support other challenge types.

# Internationalisation
The UI uses the [Wikimedia jQuery.i18n framework](https://github.com/wikimedia/jquery.i18n) to support translations. Currently translation files are provided for English, (une très mauvaise traduction en) French, and (eine schlechte Übersetzung ins) German. To generate your own translation (or improve on Google's), copy `/i18n/en.json` to a file using your language code (e.g. `it` for Italian) and edit the new file to provide the translation. You can use the `js/i18n/checkTranslation.js` program to check the completeness of your translations.

If you do create a translation, please feel free to issue a pull request to get it into the source code.

# Security
The assumption is that you will be running the game on a private server with a
limited, trustworthy audience. As such the security options are minimal; access
to the game play is not protected. There is an option to apply basic
authentication to the games management interface that will prevent
unauthorized deletion or creation of games - see the example config.json for
more.

The server can be configure to use HTTPS, see the example config.json for
how. HTTPS is required for notifications to work, and is recommended.

To use HTTPS you require an SSL certificate. You can generate one using the
instructions in https://linuxize.com/post/creating-a-self-signed-ssl-certificate/

# Development
Further development is welcome, especially interface translations and keeping dependencies up to date. See [DEVELOPER](doc/DEVELOPER.md) for more.

# IMPORTANT NOTICES:

[SCRABBLE®](http://www.scrabble.com/) is a registered trademark. All
intellectual property rights in and to the game are owned in the U.S.A
and Canada by Hasbro Inc., and throughout the rest of the world by
J.W. Spear & Sons Limited of Maidenhead, Berkshire, England, a
subsidiary of Mattel Inc.

This not-for-profit project is not associated with any of the owners
of the SCRABBLE® brand. If you don't already have a SCRABBLE board,
please go out and buy one!

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

The code is Copyright &copy; 2021 C-Dot Consultants. However it is
built on the work of many people, most notably Hans Hübner, Daniel
Weck, Elijah Sawyers, Andrew Appel, Guy Jacobsen, and Joshua Lewis, and
the many people who they in turn based their work on. All these individuals
are acknowledged as sharing the copyright to parts of the work.

The code is licensed under the terms of the [MIT license](https://en.wikipedia.org/wiki/MIT_License),
as the most restrictive of the licenses of the contributory works.
