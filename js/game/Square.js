/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env amd, jquery */

define("game/Square", [
    "platform"
], Platform => {

	// Map the characters in the board template to CSS classes
	const CSS_CLASS =  {
		M: /*i18n*/"square-M",
		Q: /*i18n*/"square-Q",
		q: /*i18n*/"square-q",
		T: /*i18n*/"square-T",
		t: /*i18n*/"square-t",
		D: /*i18n*/"square-D",
		d: /*i18n*/"square-d",
		_: /*i18n*/"square-_"
	};

	/**
	 * A square on the game board or rack. A Tile holder with some
	 * underlying attributes; a position, an owner, and a type that
	 * dictates the score multipliers that apply. The owner will be a
	 * subclass of {@link Surface} (a {@link Rack} or a {@link Board})
	 */
	class Square {

        /**
		 * /^[QqTtSs_]$/ see {@link Board}
		 * @member {string}
		 */
		type;

		/**
		 * Rack or Board
		 * @member {Surface?}
		 */
		owner; // Rack or Board

		/**
		 * 0-based column where the square is.
		 * @member {number}
		 */
		col = -1;

		/**
		 * 0-based row where the square is (undefined on a 1D surface).
		 * @member {number?}
		 */
		row;

		/**
		 * Unique id for this square
		 * @member {string}
		 */
		id;

		/**
		 * Multiplier for letters using this square
		 * @member {number}
		 */
		letterScoreMultiplier = 1;

		/**
		 * Multiplier for wordss using this square
		 * @member {number}
		 */
		wordScoreMultiplier = 1;

		/**
		 * Tile placed on this square
		 * @member {Tile?}
		 */
		tile;

		/**
		 * True if the tile cannot be moved i.e. it was
		 * placed in a prior move. Locked tiles don't gather
		 * bonuses.
		 * @member {boolean}
		 */
		tileLocked = false;

		/**
		 * Underlay character to put in the background of the square when
		 * there is no tile present.
		 * @member {string}
		 */
		underlay;

		/**
		 * @param {string} type /^[QqTtSs_]$/ see {@link Board}
		 * @param {Surface} owner the container this is in
		 * @param {number} col 0-based column where the square is
		 * @param {number?} row 0-based row where the square is
		 * (undefined on a rack)
		 */
		constructor(type, owner, col, row) {
			this.type = type;
			this.owner = owner; // Rack or Board
			this.col = col;
			if (typeof row !== "undefined")
				this.row = row;
			this.id = `${owner.id}_${col}`;
			if (typeof row !== "undefined")
				this.id += `x${row}`;

			// Determine score multipliers from type
			switch (this.type) {
			case "d": this.letterScoreMultiplier = 2; break;
			case "t": this.letterScoreMultiplier = 3; break;
			case "q": this.letterScoreMultiplier = 4; break;
			case "M":
			case "D": this.wordScoreMultiplier = 2; break;
			case "T": this.wordScoreMultiplier = 3; break;
			case "Q": this.wordScoreMultiplier = 4; break;
			}
		}

		/**
		 * Determine if the square has a tile or not
		 */
		isEmpty() {
			return !this.tile;
		}

		/**
		 * Place a tile on this square. Tiles are locked when a play is
		 * committed to a Board.
		 * @param {Tile?} tile the Tile to place, or undefined to remove
		 * the placement.
		 * @param {boolean} locked whether the tile is to be locked to
		 * the square (fixed on the board).
		 */
		placeTile(tile, locked) {
			if (tile && this.tile && tile !== this.tile) {
				console.error("Tile ", tile, " over ", this.tile);
				throw Error(`Square already occupied: ${this}`);
			}

			if (tile) {
				tile.col = this.col;
				if (typeof this.row !== "undefined")
					tile.row = this.row;
				this.tile = tile;
				this.tileLocked = locked;
			}
			else {
				// Note that a locked tile might be unplaced as
				// part of undoing a challenged play
				if (this.tile)
					this.tile.clean();
				delete this.tile;
			}

			// Used in the UI to update the square
			Platform.trigger("SquareChanged", [ this ]);
		}

		/**
		 * Create the jquery representation
		 * @param {string} base for id='s
		 */
		$ui() {
			const $td = $(`<td></td>`);
			$td.addClass(`square-${this.type}`);
			const $div = $(`<div id="${this.id}"><a></a></div>`);
			// Associate the square with the div for dragging
			$div.data("square", this);
			$td.append($div);
			return $td;
		}

		$refresh() {
			const $div = $(`#${this.id}`);

			/* istanbul ignore if */
			if ($div.length === 0)
				// No visual representation for this square - for
				// example, might be a square in another player's rack
				return;

			$div.removeClass("selected")
				.removeClass("temporary")
				.off("click");

			if (this.tile)
				this.refreshOccupied($div);
			else
				this.refreshEmpty($div);
		}

		/**
		 * Set the underlay; UI
		 * @param {boolean} sel 
		 */
		setUnderlay(ch) {
			this.underlay = ch;
		}

		/**
		 * Set the square as (un)selected; UI
		 * @param {boolean} sel 
		 */
		setSelected(sel) {
			/* istanbul ignore if */
			if (sel && this.tile) {
				if (this.tileLocked)
					throw Error("Attempt to select locked tile");
				$(`#${this.id}`).addClass("selected");
			} else
				$(`#${this.id}`).removeClass("selected");
		}

		/**
		 * Update a square that has a Tile dropped on it
		 * @param {jQuery} $div the <div> for the square
         * @private
		 */
		refreshOccupied($div) {
			if ($div.hasClass("ui-droppable"))
				/* istanbul ignore next */
				$div.droppable("destroy");

			$div
			.removeClass("empty-square")
			.addClass("tiled-square");

			if (this.tile.isBlank)
				$div.addClass("blank-letter");
			else
				$div.removeClass("blank-letter");

			if (this.tileLocked) {
				$div.addClass("Locked");
				if ($div.hasClass("ui-draggable"))
					/* istanbul ignore next */
					$div.draggable("destroy");
			} else {
				// tile isn't locked, valid drag source
				$div.removeClass("Locked");
				/* istanbul ignore next */
				$div
				.addClass("temporary")
				.on("click", () => Platform.trigger("SelectSquare", [ this ]));

				/* istanbul ignore next */
				$div.draggable({
					revert: "invalid",
					opacity: 1,
					helper: "clone",

					start: (event, jui) => {
						$div.css({ opacity: 0.5 });
						// Clear selection
						Platform.trigger("SelectSquare");
						// Configure drag helper
						$(jui.helper)
						.animate({"font-size" : "120%"}, 300)
						.addClass("drag-border");
					},

					drag: (event, jui) => $(jui.helper).addClass("drag-border"),

					stop: () => $div.css({ opacity: 1 })
				});
			}

			const letter = this.tile.letter;
			const score = this.tile.score;
			const $a = $("<a></a>");
			$a.append(`<span class="letter">${letter}</span>`);
			$a.append(`<span class="score">${score}</span>`);
			$div.empty().append($a);
		}

		/**
		 * Update a square that doesn't have a Tile dropped on it
		 * @param {jQuery} $div the <div> for the square
         * @private
		 */
		refreshEmpty($div) {

			// Not draggable
			if ($div.hasClass("ui-draggable"))
				/* istanbul ignore next */
				$div.draggable("destroy");

			// no tile on the square, valid drop target
			$div
			.removeClass("tiled-square")
			.removeClass("blank-letter")
			.removeClass("Locked")
			.addClass("empty-square");

			/* istanbul ignore next */
			$div.on("click", () => Platform.trigger("SelectSquare", [ this ]))
			// Handle something dropping on us
			.droppable({
				hoverClass: "drop-active",
				drop: (event, jui) => {
					const source = $(jui.draggable).data("square");
					// Tell the main UI about it
					Platform.trigger("DropSquare", [ source, this ]);
				}
			});

			const text = Platform.i18n(`square-${this.type}`);
			$div.empty().append($("<a></a>").text(text));

			if (typeof this.underlay !== "undefined")
				$div.append(`<div class="underlay">${this.underlay}</div>`);
		}

		/**
		 * @override
		 */
        /* istanbul ignore next */
		toString() {
			// All squares have a col
			let string = `${this.type} square @ ${this.col}`;
			// Squares on the board have a row too
			if (this.row >= 0)
				string += "," + this.row;

			if (this.tile) {
				string += ` => ${this.tile}`;
				if (this.tileLocked)
					string += " (Locked)";
			}
			return string;
		}
	}		

	return Square;
});
