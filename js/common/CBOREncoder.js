/*
 * Based on cbor-js, Copyright (c) 2014-2016 Patrick Gansterer <paroga@paroga.com> and (c) 2021 Taisuke Fukuno <fukuno@jig.jp>
 * This version Copyright (C) 2022 The Xanado Project
 */

define(() => {

  const POW_2_32 = 2 ** 32;
  const POW_2_53 = 2 ** 53;

  /**
   * Binary encoder for Javascript objects, following the CBOR specification.
   * CBOR specification is at https://www.rfc-editor.org/rfc/rfc8949.html
   */
  class CBOREncoder {

    /**
     * DataView being written to.
     * @private
     * @member {DataView}
     */
    view = undefined;

    /**
     * Write offset into the DataView.
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
     * Make space in the buffer for the given number of bytes.
     * @param {number} length number of bytes being written
     * @private
     */
    makeSpaceFor(length) {
      const requiredLength = this.offset + length;
      const curByteLength = this.view.buffer.byteLength;
      let newByteLength = curByteLength;
      while (newByteLength < requiredLength)
        // Double the size of the buffer
        newByteLength <<= 1;
      if (newByteLength !== curByteLength) {
        const newBuffer = new ArrayBuffer(newByteLength);
        new Uint8Array(newBuffer).set(new Uint8Array(this.view.buffer));
        this.view = new DataView(newBuffer);
      }
    }

    /**
     * Write a float.
     * @private
     * @param {number} value number to write
     */
    /*writeFloat32(value) {
      this.makeSpaceFor(4);
      this.view.setFloat32(this.offset, value);
      this.offset += 4;
    }*/

    /**
     * Write a long float.
     * @private
     * @param {number} value number to write
     */
    writeFloat64(value) {
      this.makeSpaceFor(8);
      this.view.setFloat64(this.offset, value);
      this.offset += 8;
    }

    /**
     * Write an unsigned byte.
     * @private
     * @param {number} value number to write
     */
    writeUint8(value) {
      this.makeSpaceFor(1);
      this.view.setUint8(this.offset, value);
      this.offset++;
    }

    /**
     * Write an unsigned byte array.
     * @private
     * @param {number} value byte array to write
     */
    writeUint8Array(value) {
      this.makeSpaceFor(value.length);
      for (let i = 0; i < value.length; ++i)
        this.view.setUint8(this.offset++, value[i]);
    }

    /**
     * Write an unsigned short.
     * @private
     * @param {number} value number to write
     */
    writeUint16(value) {
      this.makeSpaceFor(2);
      this.view.setUint16(this.offset, value);
      this.offset += 2;
    }

    /**
     * Write an unsigned int.
     * @private
     * @param {number} value number to write
     */
    writeUint32(value) {
      this.makeSpaceFor(4);
      this.view.setUint32(this.offset, value);
      this.offset += 4;
    }

    /**
     * Write an unsigned long.
     * @private
     * @param {number} value number to write
     */
    writeUint64(value) {
      const low = value % POW_2_32;
      const high = (value - low) / POW_2_32;
      this.makeSpaceFor(8);
      this.view.setUint32(this.offset, high);
      this.view.setUint32(this.offset + 4, low);
      this.offset += 8;
    }

    /**
     * Write a major type and the argument to that type.
     * @private
     * @param {number} type CBOR major type
     * @param {number} argument to that type
     */
    writeTypeAndArgument(type, arg) {
      if (arg < 24) {
        this.writeUint8((type << 5) | arg);
      } else if (arg < 0x100) {
        this.writeUint8((type << 5) | 24);
        this.writeUint8(arg);
      } else if (arg < 0x10000) {
        this.writeUint8((type << 5) | 25);
        this.writeUint16(arg);
      } else if (arg < 0x100000000) {
        this.writeUint8((type << 5) | 26);
        this.writeUint32(arg);
      } else {
        this.writeUint8((type << 5) | 27);
        this.writeUint64(arg);
      }
    }

    /**
     * Write a tag. Data associated with the tag can be
     * written following it using `encodeItem()`
     * @private
     * @param {number} id tag to write
     */
    writeTag(id) {
      this.writeTypeAndArgument(6, id);
    }

    /**
     * Write a Javascript object of any type.
     * Provided for use by {@linkcode CBORTagger} implementations.
     * @param {number} id tag to write
     */
    encodeItem(value) {

      if (value === false) {
        // CBOR Appendix B Jump Table - false
        this.writeUint8((7 << 5) | 20);
        return;
      }

      if (value === true) {
        // CBOR Appendix B Jump Table - true
        this.writeUint8((7 << 5) | 21);
        return;
      }

      if (value === null) {
        // CBOR Appendix B Jump Table - null
        this.writeUint8((7 << 5) | 22);
        return;
      }

      if (value === undefined) {
        // CBOR Appendix B Jump Table - undefined
        this.writeUint8((7 << 5) | 23);
        return;
      }

      switch (typeof value) {

      case "number":
        if (Math.floor(value) === value) {
          if (0 <= value && value <= POW_2_53) {
            // CBOR major type 0 - unsigned integer 0..2^64-1
            this.writeTypeAndArgument(0, value);
            return;
          }

          if (-POW_2_53 <= value && value < 0) {
            // CBOR major type 1 - negative integer -2^64..-1
            this.writeTypeAndArgument(1, -(value + 1));
            return;
          }
          // bigints handled as floats
        }

        // Note: this is Javascript, all floats are double-precision.
        // CBOR Appendix B Jump Table - double-precision float
        this.writeUint8((7 << 5) | 27);
        this.writeFloat64(value);
        return;

      case "string":
        // CBOR major type 3 - text string encoded as UTF8
        {
          const utf8data = new TextEncoder().encode(value);
          this.writeTypeAndArgument(3, utf8data.length);
          this.writeUint8Array(utf8data);
        }
        return;
      }

      if (Array.isArray(value)) {
        // CBOR major type 4 - array of data items
        this.writeTypeAndArgument(4, value.length);
        for (let i = 0; i < value.length; ++i)
          this.encodeItem(value[i]);
        return;
      }

      if (value instanceof Uint8Array) {
        // CBOR major type 2 - byte string
        this.writeTypeAndArgument(2, value.length);
        this.writeUint8Array(value);
        return;
      }

      assert(typeof value !== "function", "Can't CBOR functions");

      if (this.tagger) {
        value = this.tagger.encode(value, this);
        if (!value)
          return; // no more needs to be written
      }

      // Filter keys the tagger wants to skip
      const keys = Object.keys(value)
            .filter(k => !this.tagger || !this.tagger.skip(k));
      const length = keys.length;
      // CBOR major type 5 - map of pairs of data items
      this.writeTypeAndArgument(5, length);
      for (const key of keys) {
        this.encodeItem(key);
        this.encodeItem(value[key]);
      }
    }

    /**
     * Encode a value as a Uint8Array. This is the main entry point to the
     * encoder.
     * @param {object} value value to encode
     */
    encode(value) {
      this.view = new DataView(new ArrayBuffer(256));
      this.offset = 0;

      this.encodeItem(value);

      if (this.tagger)
        this.tagger.cleanUp();

      return new Uint8Array(this.view.buffer, 0, this.offset);
    }
  }

  return CBOREncoder;
});
