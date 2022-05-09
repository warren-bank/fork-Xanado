/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env browser, jquery */

/**
 * Dialog for robot creation. Demand loads the HTML.
 */
define("browser/AddRobotDialog", ["browser/Dialog"], (Dialog) => {

	class AddRobotDialog extends Dialog {
		
		constructor(options) {
			super("AddRobotDialog", $.extend({
				title: $.i18n("Add robot")
			}, options));
		}

		createDialog() {
			$.get("/defaults")
			.then(defaults => Promise.all([
				$.get("/dictionaries")
				.then(dictionaries => {
					const $dic = this.$dlg.find('[name=dictionary]');
					dictionaries
					.forEach(d => $dic.append(`<option>${d}</option>`));
					if (defaults.dictionary)
						$dic.val(defaults.dictionary);
					this.enableSubmit();
				})
			]))
			.then(() => super.createDialog());
		}

		openDialog() {
			return super.openDialog()
			.then(() => {
				const $gk = this.$dlg.find("[name=gameKey]");
				$gk.val(this.options.gameKey);
			});
		}
	}

	return AddRobotDialog;
});
