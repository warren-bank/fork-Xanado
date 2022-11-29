/* eslint-env node */
const assert = require("assert");
const Fs = require("fs").promises;
const Path = require("path");

const CSS = require("css");

/**
 * Examine the internals of a CSS file and extract any url() calls.
 * Copy the files referenced using the copier.
 * @param {string} path in path relative to the copier root
 * @param {Configurator} copying object
 */
module.exports = (path, copier) => {
  return copier.copyFile(path, path)
  .then(() => copier.readFile(path))
  .then(data => CSS.parse(data.toString()))
  .then(css => {
    const dir = Path.dirname(path);
    css.stylesheet.rules.filter(rule => rule.type === "rule").forEach(
      rule => {
        rule.declarations.forEach(
          d => {
            let m = /(?:^|\s)url\(\s*(.*?)\s*\)/.exec(d.value);
            if (m) {
              const url = m[1].replace(/^["']/, "").replace(/['"]$/, "");
              if (!/^(data|http|https):/.test(url))
                copier.copyFile(Path.join(dir, url),
                                Path.join(dir, url));
            }
          });
      });
  });
};
