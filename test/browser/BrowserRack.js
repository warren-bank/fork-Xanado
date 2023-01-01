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

import { I18N } from "../../src/server/I18N.js";

import { BrowserGame } from "../../src/browser/BrowserGame.js";

const Player = BrowserGame.CLASSES.Player;
const Rack = BrowserGame.CLASSES.Rack;
const Tile = BrowserGame.CLASSES.Tile;
const Square = BrowserGame.CLASSES.Square;

/**
 * Unit tests for Rack
 */
describe("browser/BrowserRack", () => {

  before(() => {
    // Delayed imports to allow jQuery to be defined
    $.i18n = I18N;
    return Promise.all([
      I18N().load("en"),
      import("jquery-ui/dist/jquery-ui.js")
    ]);
  });

  it("$ui empty", () => {
    let $dact = $("<div></div>");
    $("body").append($dact);

    let $table = $("<table></table>");
    $dact.append($table);

    let r = new Rack(BrowserGame.CLASSES, { id: "base", size: 2});
    r.$populate($table);

    let $dexp = $("<div></div>");
    $("body").append($dexp);

    let $exp = $('<table><tbody><tr><td class="square-_ ui-droppable" id="base_0"></td><td class="square-_ ui-droppable" id="base_1"></td></tr></tbody></table>');
    $dexp.append($exp);

    assert($dact[0].isEqualNode($dexp[0]),
           "\nexpected:" + $dexp.html() + "\n" +
           "  actual:" + $dact.html());
    $("body").empty();
  });

  it('$ui empty underlay', () => {
    let $dact = $("<div></div>");
    $("body").append($dact);

    let $table = $("<table></table>");
    $dact.append($table);

    let r = new Rack(BrowserGame.CLASSES, { id: 'base', size: 2, underlay: "£"});
    r.$populate($table);

    let $dexp = $("<div></div>");
    $("body").append($dexp);
    
    let $exp = $('<table><tbody><tr><td class="square-_ ui-droppable" id="base_0"><div class="underlay">£</div></td><td class="square-_ ui-droppable" id="base_1"></td></tr></tbody></table>');
    $dexp.append($exp);

    assert($dact[0].isEqualNode($dexp[0]),
           "\nexpected:" + $dexp.html() + "\n" +
           "  actual:" + $dact.html());
    $("body").empty();
  });

  it('$ui tiled', () => {
    let $dact = $("<div></div>");
    $("body").append($dact);

    let $table = $("<table></table>");
    $dact.append($table);

    let r = new Rack(BrowserGame.CLASSES, { id: 'base', size: 2});
    r.$populate($table);

    r.addTile(new Tile({letter:'S'}));
    r.addTile(new Tile({letter:'Q'}));

    let $dexp = $("<div></div>");
    $("body").append($dexp);

    let $exp = $('<table><tbody><tr><td class="square-_" id="base_0"><div class="Tile ui-draggable ui-draggable-handle unlocked-tile"><div class="glyph"><span class="letter">S</span><span class="score">0</span></div></div></td><td class="square-_" id="base_1"><div class="Tile ui-draggable ui-draggable-handle unlocked-tile"><div class="glyph"><span class="letter">Q</span><span class="score">0</span></div></div></td></tr></tbody></table>');
    $dexp.append($exp);

    assert($dact[0].isEqualNode($dexp[0]),
           "\nexpected:" + $dexp.html() + "\n" +
           "  actual:" + $dact.html());
    $("body").empty();
  });
});

