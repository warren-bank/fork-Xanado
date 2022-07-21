/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

/**
 * Dialog for game creation. Demand loads the HTML.
 */
define([
	"browser/Dialog", "game/Types", "game/Game"
], (Dialog, Types, Game) => {

  const Timer = Types.Timer;
  const Penalty = Types.Penalty;
  const WordCheck = Types.WordCheck;

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

    showTimerFields() {
      const type = this.$dlg.find("[name=timerType]").val();
      switch (type) {
      default:
        this.$dlg.find("[name=timeLimitMinutes]")
        .parent().hide();
        this.$dlg.find("[name=timePenalty]")
        .parent().hide();
        break;
      case Timer.TURN:
        this.$dlg.find("[name=timeLimitMinutes]")
        .parent().show();
        this.$dlg.find("[name=timePenalty]")
        .parent().hide();
        break;
      case Timer.GAME:
        this.$dlg.find("[name=timeLimitMinutes]")
        .parent().show();
        this.$dlg.find("[name=timePenalty]")
        .parent().show();
        break;
      }
    }

    showPenaltyFields() {
      const type = this.$dlg.find("[name=challengePenalty]").val();
      switch (type) {
      default:
        this.$dlg.find("[name=penaltyPoints]")
        .parent().hide();
        break;
      case Penalty.PER_TURN:
      case Penalty.PER_WORD:
        this.$dlg.find("[name=penaltyPoints]")
        .parent().show();
        break;
      }
    }

    showFeedbackFields() {
      const dic = this.$dlg.find("[name=dictionary]").val();
      this.$dlg.find("[name=wordCheck]")
      .parent().toggle(dic !== "none");
    }

		createDialog() {
      function makeOptions(list, $sel) {
        for (const p of list)
          $sel.append(
				    `<option value="${p ? p : 'none'}">${p ? $.i18n(p) : $.i18n("None")}</option>`);
      }
			const $pen = this.$dlg.find("[name=challengePenalty]");
			makeOptions(Penalty._types, $pen);
      $pen.on("selectmenuchange", () => this.showPenaltyFields());
      this.showPenaltyFields();

			const $tim = this.$dlg.find("[name=timerType]");
			makeOptions(Timer._types, $tim);
      $tim.on("selectmenuchange", () => this.showTimerFields());
      this.showTimerFields();

			const $wc = this.$dlg.find("[name=wordCheck]");
			makeOptions(WordCheck._types, $wc);

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
						$dics.val((this.ui.getSetting('dictionary')));
          $dics.on("selectmenuchange", () => this.showFeedbackFields());
          this.showFeedbackFields();
				})
			])
			.then(() => super.createDialog());
		}
	}

	return CreateGameDialog;
});
