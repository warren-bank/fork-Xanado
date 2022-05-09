/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env browser */

/**
 * Browser app for the actual game. Instantiates the UI when
 * jquery and required plugins report ready.
 */
requirejs(['browser/browserApp', 'browser/Ui'], (browserApp, Ui) => {
	browserApp.then(() => new Ui());
});

