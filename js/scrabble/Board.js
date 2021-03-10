define("scrabble/Board", ["triggerEvent", "scrabble/Square"], (triggerEvent, Square) => {

	// Lower-right quadrant, so 0,0 is the middle
	// d = double letter, D = double word
	// t = triple letter, T = triple word
	// q = quad letter, Q = quad word
	// Scrabble is a 15x15 board (2 players)
	// Super Scrabble is 21x21 (3-4 players)
	
	// Ultra is 25x25 (5-6 players)
	
	// TODO: This board is just for SuperScrabble, needs extending for Ultra
	const BOARD = [
		"D___d__T__d",
		"_d___d__D__",
		"__t___t__D_",
		"___D______T",
		"d___D__d___",
		"_d___D__q__",
		"__t___D__t_",
		"T___d__T__d",
		"_D___q__D__",
		"__D___t__D_",
		"d__T___d__Q"
	];
	
	class Board {
		
		constructor(edition) {
			this.dim = edition.dim;
			this.middle = Math.floor(this.dim / 2);
			
			this.squares = new Array(this.dim);

			for (let x = 0; x < this.dim; x++) {
				this.squares[x] = new Array(this.dim);
				const xi = Math.abs(x - this.middle);

				for (let y = 0; y < this.dim; y++) {
					const yi = Math.abs(y - this.middle);
					let type = BOARD[xi].charAt(yi);
					this.squares[x][y] = new Square(type, this, x, y);
				}
			}

			triggerEvent('BoardReady', [ this ]);
		}
		
		forAllSquares(f) {
			for (let x = 0; x < this.dim; x++) {
				const row = this.squares[x];
				for (let y = 0; y < this.dim; y++)
					f(row[y]);
			}
		}

		emptyTiles() {
			this.forAllSquares(function (square) {
				square.placeTile(null);
			});
		}

		toString() {
			let s = `Board ${this.dim}x${this.dim}`;
			for (let y = 0; y < this.dim; y++) {
				s += "\n";
				for (let x = 0; x < this.dim; x++) {
					s += this.squares.type;
				}
			}
			return s;
		}

		touchingOld(x, y) {
			return (
				(x > 0 && this.squares[x - 1][y].tile && this.squares[x - 1][y].tileLocked)
				|| (x < this.dim - 1 && this.squares[x + 1][y].tile
					&& this.squares[x + 1][y].tileLocked)
				|| (y > 0 && this.squares[x][y - 1].tile
					&& this.squares[x][y - 1].tileLocked)
				|| (y < this.dim - 1 && this.squares[x][y + 1].tile
					&& this.squares[x][y + 1].tileLocked));
		}

		// Caclulate wordscore assuming word is horizontal
		horizontalWordScores(move, squares) {
			let score = 0;
			for (let y = 0; y < this.dim; y++) {
				for (let x = 0; x < this.dim - 1; x++) {
					if (squares[x][y].tile && squares[x + 1][y].tile) {
						let wordScore = 0;
						let letters = '';
						let wordMultiplier = 1;
						let isNewWord = false;
						for (; x < this.dim && squares[x][y].tile; x++) {
							let square = squares[x][y];
							let letterScore = square.tile.score;
							isNewWord = isNewWord || !square.tileLocked;
							if (!square.tileLocked) {
								switch (square.type) {
								case 'd':
									letterScore *= 2;
									break;
								case 't':
									letterScore *= 3;
									break;
								case 'q':
									letterScore *= 4;
									break;
								case 'D':
									wordMultiplier *= 2;
									break;
								case 'T':
									wordMultiplier *= 3;
									break;
								case 'Q':
									wordMultiplier *= 4;
									break;
								}
							}
							wordScore += letterScore;
							letters += square.tile.letter;
						}
						wordScore *= wordMultiplier;
						if (isNewWord) {
							move.words.push({ word: letters, score: wordScore });
							score += wordScore;
						}
					}
				}
			}
			move.score += score;
		}

		calculateMove() {
			const squares = this.squares;
			// Check that the start field is occupied

			if (!squares[this.middle][this.middle].tile) {
				return { error: "start field must be used" };
			}
			
			// Determine that the placement of the Tile(s) is legal
			
			// Find top-leftmost placed tile
			let x, y;
			let topLeftX, topLeftY;
			let tile;
			for (y = 0; !tile && y < this.dim; y++) {
				for (x = 0; !tile && x < this.dim; x++) {
					if (squares[x][y].tile && !squares[x][y].tileLocked) {
						tile = squares[x][y].tile;
						topLeftX = x;
						topLeftY = y;
					}
				}
			}
			if (!tile) {
				return { error: "no new tile found" };
			}
			
			// Remember which newly placed tile positions are legal
			const legalPlacements = new Array(this.dim);
			for (let x = 0; x < this.dim; x++) {
				legalPlacements[x] = new Array(this.dim);
			}
			legalPlacements[topLeftX][topLeftY] = true;
			
			let isTouchingOld = this.touchingOld(topLeftX, topLeftY);
			let horizontal = false;
			for (let x = topLeftX + 1; x < this.dim; x++) {
				if (!squares[x][topLeftY].tile) {
					break;
				} else if (!squares[x][topLeftY].tileLocked) {
					legalPlacements[x][topLeftY] = true;
					horizontal = true;
					isTouchingOld = isTouchingOld || this.touchingOld(x, topLeftY);
				}
			}

			if (!horizontal) {
				for (let y = topLeftY + 1; y < this.dim; y++) {
					if (!squares[topLeftX][y].tile) {
						break;
					} else if (!squares[topLeftX][y].tileLocked) {
						legalPlacements[topLeftX][y] = true;
						isTouchingOld = isTouchingOld || this.touchingOld(topLeftX, y);
					}
				}
			}

			if (!isTouchingOld && !legalPlacements[this.middle][this.middle]) {
				return { error: 'not touching old tile ' + topLeftX + '/' + topLeftY };
			}

			// Check whether there are any unconnected other placements, count total tiles on board
			let totalTiles = 0;
			for (let x = 0; x < this.dim; x++) {
				for (let y = 0; y < this.dim; y++) {
					let square = squares[x][y];
					if (square.tile) {
						totalTiles++;
						if (!square.tileLocked && !legalPlacements[x][y]) {
							return { error: 'unconnected placement' };
						}
					}
				}
			}
			
			if (totalTiles == 1) {
				return { error: 'first word must consist of at least two letters' };
			}

			let move = { words: [], score: 0 };

			this.horizontalWordScores(move, squares);
			// Create rotated version of the board to calculate vertical word scores.
			const rotatedSquares = new Array(this.dim);
			for (let x = 0; x < this.dim; x++) {
				rotatedSquares[x] = new Array(this.dim);
				for (let y = 0; y < this.dim; y++) {
					rotatedSquares[x][y] = squares[y][x];
				}
			}
			this.horizontalWordScores(move, rotatedSquares);

			// Collect and count tiles placed.
			let tilesPlaced = [];
			for (let x = 0; x < this.dim; x++) {
				for (let y = 0; y < this.dim; y++) {
					let square = squares[x][y];
					if (square.tile && !square.tileLocked) {
						tilesPlaced.push({ letter: square.tile.letter,
										   x: x,
										   y: y,
										   blank: square.tile.isBlank() });
					}
				}
			}
			if (tilesPlaced.length == 7) {
				move.score += 50;
				move.allTilesBonus = true;
			}
			move.tilesPlaced = tilesPlaced;

			return move;
		}
	}

/*	CheckDictionary() {
		var word = "";
		var wordSquares = [];
	
		var validHorizontalWords = [];
		var validVerticalWords = [];

		var invalidSquares = [];

		var square = this.Squares[this.middle][this.middle];
		if (square.Tile == 0) {
			triggerEvent("ScrabbleBoardSquareStateChanged", { 'Board': this, 'Square': square, 'State': 1 });
	
			invalidSquares.push(square);
		}

		for (var y = 0; y < this.dim; y++) {
			for (var x = 0; x < this.dim; x++) {
				var square = this.Squares[x][y];
				if (square.Tile != 0) {
					wordSquares.push(square);
					word += square.Tile.Letter;
				} else {
					if (word.length <= 1 || !this.Game.Dictionary.CheckWord(word)) {
						for (var i = 0; i < wordSquares.length; i++) {
							var square = wordSquares[i];
							var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
							var td = document.getElementById(id).parentNode;
						
							//$(td).addClass("Invalid");
							triggerEvent("ScrabbleBoardSquareStateChanged", { 'Board': this, 'Square': square, 'State': 1 });
							
							invalidSquares.push(square);
						}
					} else {
						var newArray = wordSquares.slice();
						validHorizontalWords.push(newArray);
					}
				
					word = "";
					wordSquares = [];
				}
			}
		}
	
		for (var x = 0; x < this.dim; x++) {
			for (var y = 0; y < this.dim; y++) {
				var square = this.Squares[x][y];
				if (square.Tile != 0) {
					wordSquares.push(square);
					word += square.Tile.Letter;
				} else {
					if (word.length <= 1 || !this.Game.Dictionary.CheckWord(word)) {
						for (var i = 0; i < wordSquares.length; i++) {
							var square = wordSquares[i];
							var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
							var td = document.getElementById(id).parentNode;
							
							$(td).addClass("Invalid");
							triggerEvent("ScrabbleBoardSquareStateChanged", { 'Board': this, 'Square': square, 'State': 1 });
							
							invalidSquares.push(square);
						}
					} else {
						var newArray = wordSquares.slice();
						validVerticalWords.push(newArray);
					}
					
					word = "";
					wordSquares = [];
				}
			}
		}

		for (var i = 0; i < validHorizontalWords.length; i++) {
			wordSquares = validHorizontalWords[i];
			for (var j = 0; j < wordSquares.length; j++) {
				var square = wordSquares[j];
				var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
				var td = document.getElementById(id).parentNode;
				//$(td).removeClass("Invalid");
				//$(td).addClass("Valid");
				triggerEvent("ScrabbleBoardSquareStateChanged", { 'Board': this, 'Square': square, 'State': 0 });
			
				for (var k = 0; k < invalidSquares.length; k++) {
					if (invalidSquares[k] == square) {
						invalidSquares.splice(k--, 1);
					}
				}
			}
		}
	
		for (var i = 0; i < validVerticalWords.length; i++) {
			wordSquares = validVerticalWords[i];
		
			for (var j = 0; j < wordSquares.length; j++) {
				var square = wordSquares[j];
				//TODO: check if there is a path to the center square
				//TODO: check played tiles (!Tile.Locked) are vertical XOR horizontal, and without gaps
				//triggerEvent("ScrabbleBoardSquareStateChanged", { 'Board': this, 'Square': square, 'State': 2 });
			}
		
			for (var j = 0; j < wordSquares.length; j++) {
				var square = wordSquares[j];
				var id = IDPrefix_Board_SquareOrTile + square.X + "x" + square.Y;
				var td = document.getElementById(id).parentNode;
				//$(td).removeClass("Invalid");
				//$(td).addClass("Valid");
				triggerEvent("ScrabbleBoardSquareStateChanged", { 'Board': this, 'Square': square, 'State': 0 });
			
				for (var k = 0; k < invalidSquares.length; k++) {
					if (invalidSquares[k] == square) {
						invalidSquares.splice(k--, 1);
					}
				}
			}
		}

		return invalidSquares.length == 0;
	}
*/
	return Board;
});
