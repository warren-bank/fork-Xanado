/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env browser, jquery */

/**
 * Dialog for game creation. Demand loads the HTML.
 */
define("browser/CreateGameDialog", [
	"browser/Dialog", "game/Game"
], (Dialog, Game) => {

	class CreateGameDialog extends Dialog {
		
		/**
		 * @override
		 */
		canSubmit() {
			console.log(`Validate edition ${this.$dlg.find('#edition').val()} play dictionary ${this.$dlg.find('#dictionary').val()}`);

			return (this.$dlg.find('#edition').val() !== 'none');
		}

		constructor(options) {
			super("CreateGameDialog", $.extend({
				title: $.i18n("Create game")
			}, options));
		}

		createDialog() {
			super.createDialog();

			const $pen = this.$dlg.find("#penalty");
			Game.PENALTIES.forEach(p => $pen.append(
				`<option value="${p}">${$.i18n(p)}</option>`));

			const $tim = this.$dlg.find("#timerType");
			Game.TIMERS.forEach(t => $tim.append(
				`<option value="${t}">${$.i18n(t)}</option>`));

			const $wc = this.$dlg.find("#wordCheck");
			Game.WORD_CHECKS.forEach(c => $wc.append(
				`<option value="${c}">${$.i18n(c)}</option>`));

			let promise;
			$.get("/defaults")
			.then(defaults => Promise.all([
				$.get("/editions")
				.then(editions => {
					const $eds = this.$dlg.find('#edition');
					editions.forEach(e => $eds.append(`<option>${e}</option>`));
					if (defaults.edition)
						$eds.val(defaults.edition);
					$eds.selectmenu();
					$eds.on('selectmenuchange', () => this.validate());
					this.validate();
				}),
				$.get("/dictionaries")
				.then(dictionaries => {
					const $dics = this.$dlg.find('.dictionary');
					dictionaries
					.forEach(d => $dics.append(`<option>${d}</option>`));
					if (defaults.dictionary)
						$("#dictionary").val(defaults.dictionary);
					$dics.selectmenu();
					$dics.on('selectmenuchange', () => this.validate());
					this.validate();
				})
			]));
		}

		getAction() {
			return "createGame";
		}
	}

	return CreateGameDialog;
});
