/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env browser, jquery */

define('browser/LoginDialog', ["browser/Dialog"], Dialog => {

	class LoginDialog extends Dialog {

		validate() {
			if (this.getAction() === "register") {
				const user = this.$dlg.find('#register_username').val();
				return (user
						&& user !== $.i18n('Advisor')
						&& user !== $.i18n('Robot'));
			}
			return true;
		}

		getAction() {
			const active = this.$dlg.find("#tabs").tabs("option", "active");
			return {
				0: "login",
				1: "register",
				2: "reset-password"
			}[active];
		}

		createDialog() {
			const $tabs = this.$dlg.find("#tabs");
			$tabs.tabs();
			this.$dlg.find(".forgotten-password")
			.on("click", () => $tabs.tabs("option", "active", 2));
			super.createDialog();
		}

		constructor(options) {
			super("LoginDialog", $.extend({
				title: $.i18n("Sign in")
			}, options));
		}
	}
	
	return LoginDialog;
});
