/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env browser, node */

/**
 * Simple selecting serialisation/deserialisation of a JS object graph
 * to stand-alone JSON. Does not handle function references. Full restoration
 * of objects requires class prototypes to be passed in to thaw().
 * Note that the object property prefix '_IB_' is reserved for use by this
 * module. Note also that fields who's names start with _ will not be
 * serialised.
 */
define("game/Fridge", () => {

	/**
	 * Note that the objects being frozen are "interfered with" by the
	 * addition of an _IB_ID field that indicates their "frozen ID".
	 * This is a (clumsy) solution to the lack of ES7 value objects in ES6.
	 * The frozen version (JSONified) version of objects are decorated
	 * with fields as follows:
	 * _IB_CN: constructor name
	 * _IB_REF: the _IB_ID of another object being referenced
	 * Date objects are serialised to string.
	 */
	class Fridge {

		/**
		 * Convert an object graph to stand-alone JSON.
		 */
		static freeze(object) {
			const objectsFrozen = [];

			function _freeze(unfrozen) {
				// Can't/don't want to serialise functions
				if (typeof unfrozen === "function")
					return undefined;

				if (!unfrozen || typeof unfrozen !== 'object')
					return unfrozen;

				try {
					if (unfrozen.hasOwnProperty('_IB_ID')) {
						// ref to a previously frozen object
						if (unfrozen.constructor) {
							//console.log(`Ref to ${unfrozen._IB_ID} ${unfrozen.constructor.name}`);
							return { _IB_REF: unfrozen._IB_ID };
						}
					}
				} catch (e) {
					debugger;
				}
				const id = objectsFrozen.length;
				// Working property will be removed later
				Object.defineProperty(unfrozen, '_IB_ID', {
					configurable: true,
					value: id
				});
				objectsFrozen.push(unfrozen);

				let frozen = {};

				frozen._IB_ID = id;

				if (unfrozen.constructor
					&& unfrozen.constructor.name
					&& unfrozen.constructor.name !== 'Object')
					frozen._IB_CN = unfrozen.constructor.name;

				if (frozen._IB_CN === 'Date') {
					frozen._IB_DATA = unfrozen.getTime();
					return frozen;

				} else if (frozen._IB_CN === 'Array') {

					frozen._IB_DATA = [];
					for (let i = 0; i < unfrozen.length; i++)
						frozen._IB_DATA.push(_freeze(unfrozen[i]));

				} else {
					frozen._IB_DATA = {};
					for (let prop in unfrozen)
						// Exclude _* to avoid _events etc
						if (!/^_/.test(prop))
							frozen._IB_DATA[prop] = _freeze(unfrozen[prop]);
				}
				return frozen;
			}

			// Clean out temporary fields used in freezing
			let frozen = _freeze(object);
			for (let uf of objectsFrozen)
				delete uf._IB_ID;

			return frozen;
		}

		/**
		 * Expand a frozen structure. During freezing, the
		 * constructor name for each frozen object is recorded. During
		 * thawing, that constructor name has to be mapped to a
		 * prototype. If a useable constructor is not found, a
		 * warning will be printed to the console.
		 * @param classes optional array of classes for objects expected
		 * within frozen data.
		 */
		static thaw(object, classes) {
			let objectsThawed = [];
			let typeMap = {};

			if (classes)
				for (let clzz of classes)
					typeMap[clzz.name] = clzz.prototype;

			function _thaw(object) {
				if (!object || typeof object !== 'object')
					return object;

				if (object.hasOwnProperty('_IB_REF')) {
					// Reference to another object, that must already have
					// been thawed
					if (objectsThawed[object._IB_REF])
						return objectsThawed[object._IB_REF];
					throw Error(`Fridge: reference to unthawed ${object._IB_REF}`);
				}

				let thawed, thawProps = false;

				if (object._IB_CN === 'Date')
					return new Date(object._IB_DATA);

				else if (object._IB_CN === 'Array')
					thawed = object._IB_DATA.map(e => _thaw(e));

				else if (object._IB_CN) {
					let constructor = typeMap ? typeMap[object._IB_CN] : null;
					if (constructor)
						thawed = Object.create(constructor);
					else {
						console.log(`Warning: don't know how to recreate a ${object._IB_CN}`);
						debugger;
						thawed = {};
					}
					thawProps = true;
				} else {
					thawed = {};
					thawProps = true;
				}

				if (object.hasOwnProperty('_IB_ID'))
					objectsThawed[object._IB_ID] = thawed;

				if (thawProps)
					for (let prop in object._IB_DATA)
						thawed[prop] = _thaw(
							object._IB_DATA[prop], objectsThawed);

				return thawed;
			}

			return _thaw(object);
		}
	}
	return Fridge;
});
