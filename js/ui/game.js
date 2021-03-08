/* eslint-env browser */

requirejs(["jquery", "ui/Ui"], (jq, Ui) => {
	$(document).ready(() => {
		new Ui();
	});
});

