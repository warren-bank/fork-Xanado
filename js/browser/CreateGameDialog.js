/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
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
			console.debug("Validate edition",
						  this.$dlg.find("[name=edition]").val(),
						  "play dictionary",
						  this.$dlg.find("[name=dictionary]").val());
			return (this.$dlg.find("[name=edition]").val() !== 'none');
		}

		constructor(options) {
			super("CreateGameDialog", $.extend({
				title: $.i18n("Create game")
			}, options));
			this.ui = options.ui;
		}

		createDialog() {
			const $pen = this.$dlg.find("[name=timePenalty]");
			Game.PENALTIES.forEach(p => $pen.append(
				`<option value="${p}">${$.i18n(p)}</option>`));

			const $tim = this.$dlg.find("[name=timerType]");
			Game.TIMERS.forEach(t => $tim.append(
				`<option value="${t}">${$.i18n(t)}</option>`));

			const $wc = this.$dlg.find("[name=wordCheck]");
			Game.WORD_CHECKS.forEach(c => $wc.append(
				`<option value="${c}">${$.i18n(c)}</option>`));

			let promise;
			Promise.all([
				$.get("/editions")
				.then(editions => {
					const $eds = this.$dlg.find('[name=edition]');
					editions.forEach(e => $eds.append(`<option>${e}</option>`));
					if (this.ui.getSetting('edition'))
						$eds.val(this.ui.getSetting('edition'));
				}),
				$.get("/dictionaries")
				.then(dictionaries => {
					const $dics = this.$dlg.find('[name=dictionary]');
					dictionaries
					.forEach(d => $dics.append(`<option>${d}</option>`));
					if (this.ui.getSetting('dictionary'))
						$dics.val((this.ui.getSetting('dictionary'));
				})
			])
			.then(() => super.createDialog());
		}
	}

	return CreateGameDialog;
});
