/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

/**
 * Dialog for user settings.
 */
define("browser/SettingsDialog", [ "browser/Dialog" ], Dialog => {

	class SettingsDialog extends Dialog {
		
		constructor(options) {
			super("SettingsDialog", $.extend({
				title: $.i18n("Options")
			}, options));

			// Known users, got afresh from /users each time the
			// dialog is opened
			this.users = [];
		}

		createDialog() {
			const $sel = this.$dlg.find('[name=theme]');
			$sel.selectmenu();
			return $.get("/themes")
			.then(themes => {
				themes
				.forEach(d => $sel.append(`<option>${d}</option>`));
				this.enableSubmit();
				super.createDialog();
			});
		}

		openDialog() {
			return super.openDialog()
			.then(() => {
				const ui = this.options.ui;
				this.$dlg.find('[name=theme]')
				.val(ui.getSetting('theme'))
				.selectmenu("refresh");
				this.$dlg.find('[type=checkbox]')
				.each(function() {
					$(this).prop('checked', ui.getSetting(this.name));
				});
				// Notification requires https
				this.$dlg.find(".require-https").toggle(ui.usingHttps);
			});
		}
	}

	return SettingsDialog;
});
