## Multiplayer word grid game Server and Web Interface

Host your own web server to play crossword games according to most of the rules of SCRABBLE®, Super SCRABBLE®, Words with Friends, or Lexulous. Or invent your own!
Has tile sets for many languages, with dictionaries in English, French, German, and Catalan, and it's easy to add more.
<p style="text-align:center;">
	<img src="/images/splash.png" width="265" height="300" alt="Board" />
</p>

## History

While there are a number of freely accessible servers out there
offering clones of the classic SCRABBLE® game, 
I wanted a game I
could host on my own server, and experiment with different
dictionaries, board layouts, tile sets, and rule combinations. And I
wanted it to be completely free. The public servers I found didn't
work for me because:

- Their code is not public, and setting up your own server is not an option.
- They are generally limited to a single version of the game.
- Their (English) dictionaries are usually based on the standard American Scrabble Tournament dictionary, which is stuffed full of obscure words that only a dedicated aficionado would know. This makes their robot games inaccessible for casual players, as a computer player will beat them every time.
- They plague you with tedious advertisements and in-app purchases.

Enter [Hans Hübner's html-scrabble](https://github.com/hanshuebner/html-scrabble), which this is a fork of.
I started out working on their code but rapidly realised the scope and
number of changes I intended required a fork, rather than bothering
them with hundreds of pull requests.

This fork has some major differences:
* It has been rewritten to use Javascript ES6 and the latest dependencies.
* It supports different board layouts and tile sets, and makes it easy to define your own.
* It reinstates some of [Daniel Weck's dictionary support](https://github.com/danielweck/scrabble-html-ui). Dictionaries have been moved server-side and made optional, and integrated into game play. New dictionaries are easy to generate from word lists.
* It supports logins, which helps you to set up tournaments and record long-term player performance.
* It adds a computer player, inspired by the work of [Elijah Sawyers](https://raw.githubusercontent.com/elijahsawyers/WordsWithFriendsHelper) (which is in turn based on the [work of Andrew W. Appel and Guy J. Jacobson](https://www.cs.cmu.edu/afs/cs/academic/class/15451-s06/www/lectures/scrabble.pdf)). The player is stupid, simply selecting the highest scoring play it can in the time allowed for its move. However this is more than enough to beat most human players.
* You can optionally play against the clock.
* Can optionally let players explore alternative moves.
* The UI has been massaged to make it more mobile device friendly, and translated to several languages.
* Lots of bug fixes and small improvements.
* Tile sets for many different languages.

# Installation

## Using an [Unofficial Mirror](https://github.com/warren-bank/fork-node-multiplayer-scrabble-server)
The simplest (unofficial) way to install the game is to use `npm`:
```
$ npm install --global @warren-bank/scrabble
```
Once installed, run the server on the default port (9093):
```
$ scrabble
```

## Using Docker
The simplest way to install the game is to use the latest Docker
image, which you can find on [github](https://github.com/cdot/Xanado/pkgs/container/xanado).
The Docker image takes care of all dependencies etc. for you. Download the image and:
```
$ docker run -p 9093:9093 xanado
```
to run the server on port 9093 of the host machine.

## The Hard Way
First use `git clone` to clone the repository to your local machine. Then in
the root directory of the distribution
```
$ npm install
```
to install dependencies.

The default configuration is described [here](CONFIGURATION.md).
You can override any of the configuration defaults by creating a file named `config.json`
and placing it in the root directory, or by passing your own file using `--config`.

Once you are happy wih the configuration, run the server using:
```
$ node server.js
```
or
```
$ npm run server
```
You can then visit the games page at `http://localhost:9093`.

## Playing with other people

If you want other internet users to access your game server, they have
to be able to access a port on the server. If your server is already
public on the internet that's no problem, but if it is hidden away on
your local area network, you may need to make it visible. Fortunately
that's fairly easy to do, and does not compromise security if it's
done properly.
[This article](https://medium.com/botfuel/how-to-expose-a-local-development-server-to-the-internet-c31532d741cc) describes how.

If you want the server to send out email invitations, you should refer to the `nodemailer` documentation for information on how to configure it.

# Usage

Players start on the games page. This shows a leader board and a list
of games. You can select "Show finished games" to view games that have
ended.

When you click on a game, a dialog opens up showing a list of players in the game
with their scores and
whether they are currently connected or not.
If you are signed in, you can join the game (or open a game you have
previously joined), leave the game, add a robot, or delete it.
 
If you are signed in you can also create a new game.  Normally one
player will create a game, then other players sign in and join
the game from the games page. 

The game interface is fairly self explanatory if you know
the [rules of Scrabble](https://www.officialgamerules.org/scrabble).

When you create a game you can select the edition (the game board,
rules, and tile set), the dictionary for checking words, and whether
there is to be a time limit. You can also set a minimum number of
players, or a maximum number of players who can join, and enable or
disable some gameplay features.

Anyone signed in can add or remove a
robot player, or even delete the game, even if they are not a player.
You can only have one robot in any one game, and you need at least one
human player (otherwise, what's the point?)

When you add a robot to a game, you can optionally select a different
dictionary that the robot will search to find plays. Limiting the
robot to a smaller dictionary will give less challenging gameplay, but
may be more suitable for less experienced players.

The installation comes with a number of 'editions' that emulate some
commercially available games - SCRABBLE®, Super SCRABBLE®, Lexulous,
and Words With Friends - all of which have very similar
gameplay. Guidance for creating your own custom game is given below.

## Game play

The game user interface uses the mouse, or screen touches on mobile
devices. Click the mouse on a letter in the rack and drag it to the
board position where you want to drop it, or touch the tile you want
to move, then touch where you want to place it.

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

To assist learners, there are some special 'chat' messages that can be entered.
- `hint` tells you the highest scoring play the computer can find for you, before your play. Everyone in the game is told when you send this message (to prevent cheating.)
- `advise` will turn on/off post-play analysis. This will suggest an alternative, higher-scoring play, if one exists, that you could have played. Everyone in the game is told when you enable analysis (to prevent cheating.)
- `allow <word>` adds `<word>` to the dictionary. The new word will not be written back to the dictionary database, so will be lost when the server is restarted. If you want to keep the word forever, see [Whitelists](#Whitelists). Everyone in the game is told when someone allows a new word.
Note that these only work in games for which a dictionary has been selected.

# Editions

The `/editions` directory contains the files that are used to specify the
games that can be played. Each specification is made up from:
* A board layout, giving the size of the board and the locations of double, triple and quadruple word scores
* A tile set, which lists the legal letters and the number of tiles of each letter
* A rack size, and the number of tiles you can swap
* Bonuses to be given for long words

The following editions are included:
* Scrabble, with tile sets for many languages
* SuperScrabble (21x21 board)
* Words with Friends
* Lexulous

# Dictionaries
The `/dictionaries` directory contains all the
dictionaries. Included with the installation are a number of pre-built dictionaries:
- `CSW2019_English` - 280K words from the Collins Scrabble Words 2019 dictionary
- `SOWPODS_English` - 409K words from an [unofficial version](https://www.wordgamedictionary.com/sowpods/download/sowpods.txt) of the standard European English SCRABBLE® competition dictionary.
- `German` - 404k word list from the [germandict project on Sourceforge](https://sourceforge.net/projects/germandict/files/).
- `British_English` - a custom 68k word British English dictionary, designed for casual players, to reflect the average vocabulary of a university-educated Briton. Note that many American spellings are also included, to reflect the flexible nature of our shared language.
- `ODS8_French` - 411k word French SCRABBLE® competition dictionary.
- `Oxford_5000` - 29K words derived from the [Oxford Learner's Dictionary](https://www.oxfordlearnersdictionaries.com/wordlists/oxford3000-5000)
- `DISC_Catalan` - 580k words.
Other dictionaries may be added over time.

## Whitelists
Regenerating a docitionary can be time consuming, so dictionaries can be
extended "on the fly" using a simple list of words in a file alongside the dictionary file, with the same name but the extension `.white`. For example, `Oxford_5000.white`. The file will be read each time the server is restarted.

# Security
The assumption is that you will be running the game on a private
server with a limited, trustworthy audience.

The server can be configured to use HTTPS, see the example config.json
for how. HTTPS is required for social media logins and notifications
to work, and is highly recommended when using default logins. To use
HTTPS you require an SSL
certificate. See
https://linuxize.com/post/creating-a-self-signed-ssl-certificate/
for instructions.

# Development
The server code is written in Javascript ES6 and tested using `node.js` version 12.0.0. It may work in earlier versions of `node.js`, but is untested. The client is also written in Javascript and works in all the browsers I tested (Chrome, Firefox, Android, Opera.) Apple products - iOS, Safari, MacOS - are NOT tested and are known to exhibit problems.

Further development is welcome, especially:
- User interface translations
- Security
- Dictionaries and tile sets for new languages
- Keeping dependencies up to date
See [DEVELOPER](doc/README.md) for more.

# IMPORTANT NOTICES

- [SCRABBLE®](http://www.scrabble.com/) is a registered trademark. All
intellectual property rights in and to the game are owned in the U.S.A
and Canada by Hasbro Inc., and throughout the rest of the world by
J.W. Spear & Sons Limited of Maidenhead, Berkshire, U.K., a
subsidiary of Mattel Inc. If you don't already own a SCRABBLE board,
buy one today!
- There is an offical computer version of [SCRABBLE® published by Ubisoft](https://www.ubisoft.com/en-gb/game/scrabble).
- ["Words With Friends"](https://www.zynga.com/games/words-with-friends-2/)
is the name of an online game produced by Zynga Inc. To
the best of our knowledge this is not a registered trademark.
- "Lexulous" is the name of an online game hosted at
http://lexulous.com. To the best of our knowledge this is not a
registered trademark.

This not-for-profit project is not associated with any of the owners
of the aforementioned brands.

## CODE COPYRIGHT AND LICENSE

The current code was written by Crawford Currie and is
Copyright &copy; 2021-2022 Xanado Project. However it is
built on the work of many people, most notably Hans Hübner, Daniel
Weck, Elijah Sawyers, Andrew Appel, Guy Jacobsen, and Joshua Lewis, and
the many people who they in turn based their work on. All these individuals
are acknowledged as sharing the copyright to parts of the work.

The code is licensed under the terms of the [MIT license](https://en.wikipedia.org/wiki/MIT_License),
as the most restrictive of the licenses of the contributory works.
