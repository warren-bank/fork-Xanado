/*
 * Based on cbor-js, Copyright (c) 2014-2016 Patrick Gansterer <paroga@paroga.com> and (c) 2021 Taisuke Fukuno <fukuno@jig.jp>
 * This version Copyright (C) 2022 The Xanado Project
 */

/**
 * CBOR specification is at https://www.rfc-editor.org/rfc/rfc8949.html
 * Converted to AMD module for Xanado, and support for tags added
 * CC 2022-12-01
 */

/* global TypedArray */

define(() => {

  const POW_2_24 = 5.960464477539063e-8;
  const POW_2_32 = 2 ** 32;

  /**
   * Decoder for objects encoded according to the CBOR specification.
   * A tagger object must be provded to handle extensions to basic
   * CBOR.
   */
  class CBORDecoder {

    /**
     * DataView being read from.
     * @private
     * @member {DataView}
     */
    view = undefined;

    /**
     * Read offset into the DataView.
     * @private
     * @member {number}
     */
    offset = undefined;

    /**
     * @param {CBORTagger} tagger tagger object, called on all objects
     */
    constructor(tagger) {
      /**
       * Tagger object.
       * @member {CBORTagger}
       * @private
       */
      this.tagger = tagger;
    }

    /**
     * Take a data buffer and return it decoded as a Javascript object.
     * @param {TypedArray|ArrayBuffer|DataView} data encoded data
     * @param {Tagger} tagger
     * @return {object} object decoded from the data
     */
    decode(data) {

      if (data instanceof DataView) {
        this.view = data;
        this.offset = 0;

        const ret = this.decodeItem();
        if (this.tagger)
          this.tagger.cleanUp();

        if (this.offset !== data.byteLength)
          throw Error(`CBOR excess data: read ${this.offset} of ${data.byteLength}`);

        return ret;
      }

      if (data instanceof ArrayBuffer)
        return this.decode(new DataView(data, 0, data.length));

      // TypedArray, but node.js doesn't define it so can't use instanceof
      assert(data.buffer
             && typeof data.byteLength === "number"
             && typeof data.byteOffset == "number");

      return this.decode(
        new DataView(data.buffer, data.byteOffset, data.byteLength));
    }

    /**
     * Read a short float.
     * @return {number} the data read
     * @private
     */
    readFloat16() {
      const tempArrayBuffer = new ArrayBuffer(4);
      const tempDataView = new DataView(tempArrayBuffer);
      const value = this.readUint16();

      const sign = value & 0x8000;
      let exponent = value & 0x7c00;
      const fraction = value & 0x03ff;

      if (exponent === 0x7c00)
        exponent = 0xff << 10;
      else if (exponent !== 0)
        exponent += (127 - 15) << 10;
      else if (fraction !== 0)
        return (sign ? -1 : 1) * fraction * POW_2_24;

      tempDataView.setUint32(0, sign << 16 | exponent << 13 | fraction << 13);
      return tempDataView.getFloat32(0);
    }

    /**
     * Read a float.
     * @return {number} the data read
     * @private
     */
    readFloat32() {
      const val = this.view.getFloat32(this.offset);
      this.offset += 4;
      return val;
    }

    /**
     * Read a long float.
     * @return {number} the data read
     * @private
     */
    readFloat64() {
      const val = this.view.getFloat64(this.offset);
      this.offset += 8;
      return val;
    }

    /**
     * Read an unsigned byte.
     * @return {number} the data read
     * @private
     */
    readUint8() {
      const val = this.view.getUint8(this.offset);
      this.offset += 1;
      return val;
    }

    /**
     * Read an unsigned short.
     * @return {number} the data read
     * @private
     */
    readUint16() {
      const val = this.view.getUint16(this.offset);
      this.offset += 2;
      return val;
    }

    /**
     * Read an unsigned int.
     * @return {number} the data read
     * @private
     */
    readUint32() {
      const val = this.view.getUint32(this.offset);
      this.offset += 4;
      return val;
    }

    /**
     * Read an unsigned long.
     * @return {number} the data read
     * @private
     */
    readUint64() {
      return this.readUint32() * POW_2_32 + this.readUint32();
    }

    /**
     * Skip an array break.
     * @return {boolean} true if a break was seen.
     */
    readBreak() {
      if (this.view.getUint8(this.offset) !== 0xff)
        return false;
      this.offset++;
      return true;
    }

    /**
     * Major type 7; analyse argument
     * @param {number} ai 5-bit additional information
     * @private
     */
    readArgument(ai) {
      if (ai < 24)
        return ai; // simple value 0..23
      switch (ai) {
      case 24:
        return this.readUint8(); // 32..255 in following byte
      case 25: // IEEE 754 Half-Precision Float (16 bits follow)
        return this.readUint16();
      case 26: // IEEE 754 Single-Precision Float (32 bits follow)
        return this.readUint32();
      case 27: // IEEE 754 Double-Precision Float (64 bits follow)
        return this.readUint64();
      case 31:
        return -1; // "break" stop code
      }
      throw Error(`Invalid additional information ${ai}`);
    }

    /**
     * Read a known number of bytes.
     * @param {number} length number of bytes to read
     * @return {Uint8Array} the data read
     */
    readBytes(length) {
      const val = new Uint8Array(
        this.view.buffer, this.view.byteOffset + this.offset, length);
      this.offset += length;
      //console.log("readBytes",val);
      return val;
    }

    /**
     * Read an indefinite length byte array.
     * @param {number} majorType major type of item, used for checking
     * @private
     */
    readIndefiniteBytes(majorType) {
      // series of zero or more strings of the specified type ("chunks")
      // that have definite lengths, and finished by the "break" stop code
      const readChunkLength = () => {
        const initialByte = this.readUint8();
        const type = initialByte >> 5;
        const ai = initialByte & 0x1f;
        //console.debug(`\t${pad(type)}\t${ai}`);
        if (ai === 31)
          return -1; // "break"
        if (type !== majorType)
          throw Error("Major type mismatch on chunk");
        const len = this.readArgument(ai);
        if (len < 0)
          throw Error(`Invalid chunk length ${len}`);
        return len;
      };
      const elements = [];
      let fullArrayLength = 0;
      let length;
      while ((length = readChunkLength()) >= 0) {
        fullArrayLength += length;
        elements.push(this.readBytes(length));
      }
      const fullArray = new Uint8Array(fullArrayLength);
      let fullArrayOffset = 0;
      for (let i = 0; i < elements.length; i++) {
        fullArray.set(elements[i], fullArrayOffset);
        fullArrayOffset += elements[i].length;
      }
      return fullArray;
    }

    /**
     * Read an item array.
     * @private
     * @param {number} length length of the array
     */
    readItemArray(length) {
      let ret = [];
      for (let i = 0; i < length; i++)
        ret.push(this.decodeItem());
      return ret;
    }

    /**
     * Read an indefinite length item array.
     * @private
     */
    readIndefiniteItemArray() {
      const retArray = [];
      while (!this.readBreak())
        retArray.push(this.decodeItem());
      return retArray;
    }

    /**
     * Read a list of key-value pairs.
     * @private
     * @param {number} length length of the list
     */
    readKV(length) {
      const retObject = {};
      for (let i = 0; i < length; i++) {
        const key = this.decodeItem();
        retObject[key] = this.decodeItem();
      }
      return retObject;
    }

    /**
     * Read a list of key-value pairs.
     * @private
     */
    readIndefiniteKV() {
      const retObject = {};
      while (!this.readBreak()) {
        const key = this.decodeItem();
        retObject[key] = this.decodeItem();
      }
      return retObject;
    }

    /**
     * Decode the next item on the input stream.
     * Provided for use by {@linkcode CBORTagger} implementations.
     */
    decodeItem() {
      const initialByte = this.readUint8();
      const majorType = initialByte >> 5;
      const ai = initialByte & 0x1f; // additional information

      //console.debug(`${pad(majorType)}\t${pad(ai)}`);

      switch (majorType) {

      case 0: // unsigned integer
        if (ai === 31)
          throw Error("Invalid 0 AI");
        return this.readArgument(ai);

      case 1: // negative integer
        if (ai === 31)
          throw Error("Invalid 1 AI");
        return -1 - this.readArgument(ai);

      case 2: // byte string
        if (ai === 31)
          return this.readIndefiniteBytes(majorType);
        return this.readBytes(this.readArgument(ai));

      case 3: // UTF-8 encoded text string
        if (ai === 31)
          return new TextDecoder().decode(this.readIndefiniteBytes(majorType));
        return new TextDecoder().decode(this.readBytes(this.readArgument(ai)));

      case 4: // array of data items
        if (ai === 31)
          return this.readIndefiniteItemArray();
        return this.readItemArray(this.readArgument(ai));

      case 5: // map of pairs of data items
        if (ai === 31)
          return this.readIndefiniteKV();
        return this.readKV(this.readArgument(ai));

      case 6: // tagged data item
        if (ai === 31)
          throw Error("Invalid 6 AI");
        {
          const tag = this.readArgument(ai);
          if (this.tagger) {
            const thaw = this.tagger.decode(tag, this);
            //console.log("\tthawed", thaw);
            if (typeof thaw !== "undefined")
              return thaw;
          }
        }
        // Ignore the tag
        return this.decodeItem();

      case 7: // floating point number and values with no content
        // https://www.rfc-editor.org/rfc/rfc8949.html#name-floating-point-numbers-and-
        switch (ai) {
        case 20:
          return false;
        case 21:
          return true;
        case 22:
          return null;
        case 23:
          return undefined;
        case 24:
          return this.readUint8();
        case 25:
          return this.readFloat16();
        case 26:
          return this.readFloat32();
        case 27:
          return this.readFloat64();
        }
        return ai;
      }

      /* istanbul ignore next */
      throw Error(`Unrecognised major type ${majorType}`);
    }
  }

  return CBORDecoder;
});
