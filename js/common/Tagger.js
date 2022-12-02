/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

define(() => {

  // "Hidden" field added to objects that have been serialised
  const IB_ID = "_\u00CD";

  // Private CBOR tag IDs
  // see https://www.iana.org/assignments/cbor-tags/cbor-tags.xhtml
  const CBOR_REF = 25442;
  const CBOR_CN  = 25443;
  const CBOR_ID  = 25444;

  /**
   * Implementation of tagger for CBOR of Xanado objects.
   * @extends CBORTagger
   */
  class Tagger {

    constructor(typeMap, debug) {
      this.debug = debug ? console.debug : () => {};
      this.typeMap = typeMap;
      this.objectsFrozen = [];
      this.objectsThawed = {};
      this.nextID = -1;
    }

    /**
     * @callback CBOR-taggerCleanup
     */
    cleanUp() {
      for (const uf of this.objectsFrozen)
        delete uf[IB_ID];
      this.objectsFrozen = [];
      this.objectsThawed = {};
    }

    /**
     * @override
     */
    skip(key) {
      return /^#?_/.test(key);
    }

    /**
     * @override
     */
    encode(value, cbor) {
      if (value instanceof Date) {
        // Encode dates as numbers
        cbor.writeTag(1);
        cbor.encodeItem(value.getTime());
        return undefined;
      }

      if (typeof value[IB_ID] !== "undefined") {
        // Reference to previously frozen object
        this.debug("ref", value[IB_ID]);
        cbor.writeTag(CBOR_REF);
        cbor.encodeItem(value[IB_ID]);
        return undefined;
      }

      const id = this.objectsFrozen.length;
      this.debug("freeze", id, value);
      cbor.writeTag(CBOR_ID);
      cbor.encodeItem(id);
      value[IB_ID] = id;
      this.objectsFrozen.push(value);

      // Special handling for objects that have a constructor
      if (value.constructor
          && value.constructor.name
          && value.constructor.name !== "Object") {

        // The static UNFREEZABLE attribute on a class indicates that
        // the superclass should be used in the freeze
        let freezableClass = value.constructor;
        while (freezableClass.UNFREEZABLE) {
          //this.debug(freezableClass, "unfreezable");
          freezableClass = Object.getPrototypeOf(freezableClass);
          if (freezableClass.name === "Object")
            throw Error("Bottomless unfreezable chain");
        }
        cbor.writeTag(CBOR_CN);
        cbor.encodeItem(freezableClass.name);
        this.debug("\tclassified as", freezableClass.name);
        // drop through to allow the object to be simply serialised
      }

      // Allow CBOREncoder to simply encode the object
      return value;
    }

    /**
     * @override
     */
    decode(tag, cbor) {
      let id, cln, ref, thawed, object;
      switch (tag) {

      case 1: // epoch-based date/time
        return new Date(cbor.decodeItem());

      case CBOR_ID:
        this.nextID = id = cbor.decodeItem();
        this.debug("Tag id", id);
        return this.objectsThawed[id] = cbor.decodeItem();

      case CBOR_CN:
        id = this.nextID;
        cln = cbor.decodeItem();
        this.debug("Tag cln", cln, "id", id);
        {
          const clzz = this.typeMap[cln];
          assert(clzz, `${cln} missing from type map`);
          thawed = Object.create(clzz.prototype);
        }
        // Have to do this in case the object is self-referential
        this.objectsThawed[id] = thawed;
        object = cbor.decodeItem();
        for (let prop in object)
          // DOES NOT invoke the constructor
          thawed[prop] = object[prop];
        this.debug("Unpacked", thawed);
        return thawed;

      case CBOR_REF:
        ref = cbor.decodeItem();
        this.debug("Tag ref", ref);
        assert(this.objectsThawed[ref], `Reference to unthawed ${ref}`);
        return this.objectsThawed[ref];
      }
      // Flag that we're not going to process this
      return undefined;
    }
  }

  return Tagger;
});
