/* eslint-env browser */

requirejs(["browserApp", "ui/Ui"], (browserApp, Ui) => {
	browserApp.then(() => new Ui());
});

