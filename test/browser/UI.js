/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env node, mocha */

import { JSDOM } from "jsdom";
const { window } = new JSDOM(
  '<!doctype html><html><body id="working"></body></html>');
global.window = window;
global.document = window.document;
global.navigator = { userAgent: "node.js" };
import jquery from "jquery";
global.$ = global.jQuery = jquery(window);

import { ServerPlatform } from "../../src/server/ServerPlatform.js";
global.Platform = ServerPlatform;

describe("browser/UI", () => {

  let UI;
  
  before(() =>
         import("../../src/browser/UI.js")
         .then(mod => UI = mod.UI)
         .catch(e => console.error(e)));

  it("parseURLArguments", () => {
    const a = UI.parseURLArguments("http://a.b/c?a=1&b=2;c=3");
    assert.deepEqual(a, { _URL: "http://a.b/c", a: "1", b: "2", c : "3" });

    const b = UI.parseURLArguments("https://q:9?x&a=&b=c=3;c=?");
    assert.deepEqual(b, { _URL: "https://q:9", x: true, a: "", b: "c=3", c: "?" });

    const c = UI.parseURLArguments("ftp://q?a=a%20b&b");
    assert.deepEqual(c, { _URL: "ftp://q", a: "a b", b: true });
  });

  it("makeURL", () => {
    const args = { _URL: "x", a: "b", b: true, c: "a b" };
    assert.deepEqual(UI.parseURLArguments(UI.makeURL(args)), args);
  });

  it("formatTimeInterval", () => {
    assert.equal(UI.formatTimeInterval(0), "00:00");
    assert.equal(UI.formatTimeInterval(1 * 60 + 1), "01:01");
    assert.equal(UI.formatTimeInterval(10 * 60 + 1), "10:01");
    assert.equal(UI.formatTimeInterval(60 * 60 + 1), "01:00:01");
    assert.equal(UI.formatTimeInterval(24 * 60 * 60 + 1), "1:00:00:01");
    assert.equal(UI.formatTimeInterval(2 * 24 * 60 * 60 + 1), "2:00:00:01");
    assert.equal(UI.formatTimeInterval(365 * 24 * 60 * 60 + 1), "365:00:00:01");
    assert.equal(UI.formatTimeInterval(-(60 * 60 + 1)), "-01:00:01");
  });
});
