/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

/* global assert */

import "jquery/dist/jquery.js";
import "jquery-ui/dist/jquery-ui.js";
import "@rwap/jquery-ui-touch-punch/jquery.ui.touch-punch.js";
//import { Platform } from "../common/Platform.js";

window.assert = (cond, mess) => {
  if (!cond) {
    alert("Assertion failure: " + mess);
    debugger;
    throw Error(mess);
  }
};

assert.fail = mess => assert(false, mess);

// Set up an ajax transport to read binary data
$.ajaxTransport("+binary", function (options, originalOptions, jqXHR) {
  return {
    // create new XMLHttpRequest
    send: function (headers, callback) {
      // setup all variables
      var xhr = new XMLHttpRequest(),
          url = options.url,
          type = options.type,
          async = options.async || true,
          // blob or arraybuffer. Default is blob
          dataType = options.responseType || "blob",
          data = options.data || null,
          username = options.username || null,
          password = options.password || null;

      xhr.addEventListener('load', function () {
        var data = {};
        data[options.dataType] = xhr.response;
        // make callback and send data
        callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
      });

      xhr.open(type, url, async, username, password);

      // setup custom headers
      for (var i in headers) {
        xhr.setRequestHeader(i, headers[i]);
      }

      xhr.responseType = dataType;
      xhr.send(data);
    },
    abort: function () {
      jqXHR.abort();
    }
  };
});

/**
 * Browser implementation of {@linkcode Platform}.
 * @implements Platform
 */
class BrowserPlatform /*extends Platform*/ {

  /**
   * @implements Platform
   */
  static trigger(e, args) {
    // Pass events straight to the document
    return $(document).trigger(e, args);
  }

  static i18n() {
    return $.i18n.apply($.i18n, arguments);
  }

  /**
   * @implements Platform
   */
  static getFilePath(p) {
    return `../${p}`;
  }

  /**
   * @implements Platform
   */
  static readFile(p) {
    return $.get(p);
  }

  /**
   * @implements Platform
   */
  static readBinaryFile(path) {
    return $.ajax({
      type: "GET",
      url: path,
      dataType: "binary",
      processData: "false"
    })
    .then(blob => new Response(blob).arrayBuffer())
    .then(ab => new Uint8Array(ab));
  }

  /**
   * @implements Platform
   */
  static findBestPlay() {
    // game/findBestPlay.js to block
    // backend/findBestPlayController.js to use a worker thread (untested)
    return import(
      /* webpackMode: "lazy" */
      /* webpackChunkName: "findBestPlay" */
      "../game/findBestPlay.js")
    .then(mod => mod.findBestPlay.apply(null, arguments));
  }

  /**
   * @implements Platform
   */
  static parsePath(p) {
    const bits = /^(.*\/)?([^/]*)(\.\w+)?$/.exec(p);
    return {
      root: "",
      dir: (bits[1] || "").replace(/\/$/, ""),
      name: bits[2] || "",
      ext: bits[3] || ""
    };
  }

  /**
   * @implements Platform
   */
  static formatPath(p) {
    const bits = [];
    if (p.dir && p.dir.length > 0)
      bits.push(p.dir);
    else if (p.root && p.root.length > 0)
      bits.push(p.root);
    if (p.base && p.base.length > 0)
      bits.push(p.base);
    else {
      if (p.name && p.name.length > 0)
        bits.push(p.name + p.ext);
    }
    return bits.join("/");
  }
}

export { BrowserPlatform }

