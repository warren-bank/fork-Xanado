/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

/**
 * Dialog for user settings.
 */
define([ "browser/Dialog" ], Dialog => {

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
      const curlan = $.i18n().locale;
      console.log("Curlan",curlan);
      const $theme = this.$dlg.find('[name=theme]');
      const $locale = this.$dlg.find('[name=language]');
      return Promise.all([ $.get("/themes"), $.get("/locales") ])
      .then(all => {
        all[0].forEach(d => $theme.append(`<option>${d}</option>`));
        all[1].sort((a, b) => new RegExp(`^${a}`,"i").test(curlan) ? -1 :
                    new RegExp(`^${b}`,"i").test(curlan) ? 1 : 0)
        .forEach(d => $locale.append(`<option>${d}</option>`));
        $theme.selectmenu();
        $locale.selectmenu();
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
