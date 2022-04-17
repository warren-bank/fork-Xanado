// FROM https://opensourcelibs.com/lib/cldrpluralruleparser
// npm module does not support requirejs

'use strict';

function pluralRuleParser(rule, number) {
  rule = rule.split("@")[0].replace(/^\s*/, "").replace(/\s*$/, "");
  if (!rule.length) {
    return true;
  }
  let pos = 0;
  const whitespace = makeRegexParser(/^\s+/);
  const value = makeRegexParser(/^\d+/);
  const _n_ = makeStringParser("n");
  const _i_ = makeStringParser("i");
  const _f_ = makeStringParser("f");
  const _t_ = makeStringParser("t");
  const _v_ = makeStringParser("v");
  const _w_ = makeStringParser("w");
  const _is_ = makeStringParser("is");
  const _isnot_ = makeStringParser("is not");
  const _isnot_sign_ = makeStringParser("!=");
  const _equal_ = makeStringParser("=");
  const _mod_ = makeStringParser("mod");
  const _percent_ = makeStringParser("%");
  const _not_ = makeStringParser("not");
  const _in_ = makeStringParser("in");
  const _within_ = makeStringParser("within");
  const _range_ = makeStringParser("..");
  const _comma_ = makeStringParser(",");
  const _or_ = makeStringParser("or");
  const _and_ = makeStringParser("and");
  function debug() {
  }
  function choice(parserSyntax) {
    return function() {
      let i2, result2;
      for (i2 = 0; i2 < parserSyntax.length; i2++) {
        result2 = parserSyntax[i2]();
        if (result2 !== null) {
          return result2;
        }
      }
      return null;
    };
  }
  function sequence(parserSyntax) {
    let i2;
    let parserRes;
    const originalPos = pos;
    const result2 = [];
    for (i2 = 0; i2 < parserSyntax.length; i2++) {
      parserRes = parserSyntax[i2]();
      if (parserRes === null) {
        pos = originalPos;
        return null;
      }
      result2.push(parserRes);
    }
    return result2;
  }
  function nOrMore(n2, p) {
    return function() {
      const originalPos = pos;
      const result2 = [];
      let parsed = p();
      while (parsed !== null) {
        result2.push(parsed);
        parsed = p();
      }
      if (result2.length < n2) {
        pos = originalPos;
        return null;
      }
      return result2;
    };
  }
  function makeStringParser(s) {
    const len = s.length;
    return function() {
      let result2 = null;
      if (rule.substr(pos, len) === s) {
        result2 = s;
        pos += len;
      }
      return result2;
    };
  }
  function makeRegexParser(regex) {
    return function() {
      const matches = rule.substr(pos).match(regex);
      if (matches === null) {
        return null;
      }
      pos += matches[0].length;
      return matches[0];
    };
  }
  function i() {
    let result2 = _i_();
    if (result2 === null) {
      return result2;
    }
    result2 = parseInt(number, 10);
    return result2;
  }
  function n() {
    let result2 = _n_();
    if (result2 === null) {
      return result2;
    }
    result2 = parseFloat(number, 10);
    return result2;
  }
  function f() {
    let result2 = _f_();
    if (result2 === null) {
      return result2;
    }
    result2 = (number + ".").split(".")[1] || 0;
    return result2;
  }
  function t() {
    let result2 = _t_();
    if (result2 === null) {
      return result2;
    }
    result2 = (number + ".").split(".")[1].replace(/0$/, "") || 0;
    return result2;
  }
  function v() {
    let result2 = _v_();
    if (result2 === null) {
      return result2;
    }
    result2 = (number + ".").split(".")[1].length || 0;
    return result2;
  }
  function w() {
    let result2 = _w_();
    if (result2 === null) {
      return result2;
    }
    result2 = (number + ".").split(".")[1].replace(/0$/, "").length || 0;
    return result2;
  }
  const operand = choice([n, i, f, t, v, w]);
  const expression = choice([mod, operand]);
  function mod() {
    const result2 = sequence([operand, whitespace, choice([_mod_, _percent_]), whitespace, value]);
    if (result2 === null) {
      return null;
    }
    debug(" -- passed ", parseInt(result2[0], 10), result2[2], parseInt(result2[4], 10));
    return parseFloat(result2[0]) % parseInt(result2[4], 10);
  }
  function not() {
    const result2 = sequence([whitespace, _not_]);
    if (result2 === null) {
      return null;
    }
    return result2[1];
  }
  function is() {
    const result2 = sequence([expression, whitespace, choice([_is_]), whitespace, value]);
    if (result2 !== null) {
      debug(" -- passed is :", result2[0], " == ", parseInt(result2[4], 10));
      return result2[0] === parseInt(result2[4], 10);
    }
    return null;
  }
  function isnot() {
    const result2 = sequence([expression, whitespace, choice([_isnot_, _isnot_sign_]), whitespace, value]);
    if (result2 !== null) {
      debug(" -- passed isnot: ", result2[0], " != ", parseInt(result2[4], 10));
      return result2[0] !== parseInt(result2[4], 10);
    }
    return null;
  }
  function not_in() {
    let i2;
    let range_list;
    const result2 = sequence([expression, whitespace, _isnot_sign_, whitespace, rangeList]);
    if (result2 !== null) {
      debug(" -- passed not_in: ", result2[0], " != ", result2[4]);
      range_list = result2[4];
      for (i2 = 0; i2 < range_list.length; i2++) {
        if (parseInt(range_list[i2], 10) === parseInt(result2[0], 10)) {
          return false;
        }
      }
      return true;
    }
    return null;
  }
  function rangeList() {
    const result2 = sequence([choice([range, value]), nOrMore(0, rangeTail)]);
    let resultList = [];
    if (result2 !== null) {
      resultList = resultList.concat(result2[0]);
      if (result2[1][0]) {
        resultList = resultList.concat(result2[1][0]);
      }
      return resultList;
    }
    return null;
  }
  function rangeTail() {
    const result2 = sequence([_comma_, rangeList]);
    if (result2 !== null) {
      return result2[1];
    }
    return null;
  }
  function range() {
    let i2;
    let array;
    let left;
    let right;
    const result2 = sequence([value, _range_, value]);
    if (result2 !== null) {
      array = [];
      left = parseInt(result2[0], 10);
      right = parseInt(result2[2], 10);
      for (i2 = left; i2 <= right; i2++) {
        array.push(i2);
      }
      return array;
    }
    return null;
  }
  function _in() {
    const result2 = sequence([expression, nOrMore(0, not), whitespace, choice([_in_, _equal_]), whitespace, rangeList]);
    if (result2 !== null) {
      const rangeList2 = result2[5];
      for (let i2 = 0; i2 < rangeList2.length; i2++) {
        if (parseInt(rangeList2[i2], 10) === parseFloat(result2[0])) {
          return result2[1][0] !== "not";
        }
      }
      return result2[1][0] === "not";
    }
    return null;
  }
  function within() {
    const result2 = sequence([expression, nOrMore(0, not), whitespace, _within_, whitespace, rangeList]);
    if (result2 !== null) {
      const range_list = result2[5];
      if (result2[0] >= parseInt(range_list[0], 10) && result2[0] < parseInt(range_list[range_list.length - 1], 10)) {
        return result2[1][0] !== "not";
      }
      return result2[1][0] === "not";
    }
    return null;
  }
  const relation = choice([is, not_in, isnot, _in, within]);
  function and() {
    let i2;
    const result2 = sequence([relation, nOrMore(0, andTail)]);
    if (result2) {
      if (!result2[0]) {
        return false;
      }
      for (i2 = 0; i2 < result2[1].length; i2++) {
        if (!result2[1][i2]) {
          return false;
        }
      }
      return true;
    }
    return null;
  }
  function andTail() {
    const result2 = sequence([whitespace, _and_, whitespace, relation]);
    if (result2 !== null) {
      return result2[3];
    }
    return null;
  }
  function orTail() {
    const result2 = sequence([whitespace, _or_, whitespace, and]);
    if (result2 !== null) {
      debug(" -- passed orTail: ", result2[3]);
      return result2[3];
    }
    return null;
  }
  function condition() {
    let i2;
    const result2 = sequence([and, nOrMore(0, orTail)]);
    if (result2) {
      for (i2 = 0; i2 < result2[1].length; i2++) {
        if (result2[1][i2]) {
          return true;
        }
      }
      return result2[0];
    }
    return false;
  }
  const result = condition();
  if (result === null) {
    throw new Error("Parse error at position " + pos.toString() + " for rule: " + rule);
  }
  if (pos !== rule.length) {
    debug("Warning: Rule not parsed completely. Parser stopped at ", rule.substr(0, pos));
  }
  return result;
}

// Commented out for requirejs
//module.exports = pluralRuleParser;
