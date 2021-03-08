define("scrabble/Square", ["triggerEvent"], triggerEvent => {

	class Square {
		constructor(type, owner, x, y) {
			this.type = type;
			this.owner = owner;
			
			this.x = x;
			this.y = y;
		}

		placeTile(tile, locked) {
			if (tile && this.tile) {
				throw `square already occupied: ${this}`;
			}

			if (tile) {
				this.tile = tile;
				this.tileLocked = locked;
			} else {
				delete this.tile;
				delete this.tileLocked;
			}

			triggerEvent('SquareChanged', [ this ]);
		}

		toString() {
			let string =  `Square type ${this.type} x: ${this.x}`;
			if (this.y != -1) {
				string += '/' + this.y;
			}
			if (this.tile) {
				string += ' => ' + this.tile;
				if (this.tileLocked) {
					string += ' (Locked)';
				}
			}
			return string;
		}
	}

	return Square;
});
