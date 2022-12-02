/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/

/**
 * Abstract base class for tagger objects passed to CBOR for encode/decode.
 * During encoding, the tagger `encode()` method is called on every
 * key-value object. The tagger function can decide whether to generate
 * a tag to indicate special semantics for the object, or even replace
 * it completely.
 *
 * See the CBOR specification for information about tagging.
 * @abstract
 */
class CBORTagger {

  /**
   * Clean up temporary data (if any) created during encoding or
   * decoding. Always called after {@linkcode CBOREncoder.encode}
   * and {@linkcode CBORDecoder.decode}.
   */
  cleanUp() {}

  /**
   * Function called by {@linkcode CBOREncoder} to determine whether
   * an object key is to be skipped. For example, you may want to skip
   * all keys that start with '_' to avoid encoding temporary objects.
   */
  skip(key) { return false;  }

  /**
   * If the object needs to be tagged, implementations will call
   * {@linkcode CBOREncoder.writeTag} which will inject a tag into
   * the encoded data stream. The tag can be followed with calls to
   * {@linkcode CBOREncoder.encodeItem} though care must be taken not
   * to cause an infinite loop by calling it on `value`.
   * If the value is not tagged, or you want to apply standard CBOR
   * encoding to the object, then return the object. Otherwise if the
   * object is fully encoded by the tagger, return undefined.
   * @param {object} value object that may need to be tagged
   * @param {CBOREncoder} cbor the encoder that is doing the encoding.
   * @return {object} object that needs to be serialised after this
   * tag has been processed, or undefined if sufficient has been
   * written by the tagger to fully encode the value.
   */
  encode(value, cbor) { return value; }

  /**
   * Decode a tag. The decoding of the tag and it's data must exactly
   * mirror the encoding.
   * @param {number} tag the tag ID.
   * @param {CBORDecoder} cbor the decoder invoking the tagger.
   * @return {object?} return the thawed object, or undefined if the
   * tag was not handled by the tagger.
   */
  decode(tag, cbor) { assert.fail(`No CBOR decoding for tag ${tag}`); }
}
