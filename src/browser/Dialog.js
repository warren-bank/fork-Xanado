/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */

/* global Platform */

/**
 * Base class of modal dialogs with demand-loadable HTML and a submit
 * button.
 *
 * HTML is loaded on demand from the html directory, based in the `id`
 * of the dialog (or the `html` option.
 *
 * In the HTML, any input or select that has a "name" attribute will
 * be used to populate a structure representing the dialog data.
 *
 * If a `postAction` URL option is set, this structure will be posted to the
 * URL and the result passed to an optional `postResult` function.
 *
 * Alternatively (or additionally), the `onSubmit` option can be set to
 * a function that will be called with `this` when the submit button
 * is pressed, *before* the `postAction` is sent.
 */
class Dialog {

  /**
   * Construct the named dialog, demand-loading the HTML as
   * necessary. Do not use this - use {@linkcode Dialog#open|open()}
   * instead.
   * @param {string} id the dialog name
   * @param {object} options options
   * @param {string?} options.html optional name of HTML file to
   * load, defaults to the id of the dialog
   * @param {string?} options.postAction AJAX call name. If defined,
   * the dialog fields will be posted here on close.
   * @param {function?} options.postResult passed result
   * of postAction AJAX call. Does nothing unless `postAction` is also
   * defined.
   * @param {function?} options.onSubmit Passed this, can be used without
   * postAction.
   * @param {function} options.error error function, passed jqXHR
   */
  constructor(id, options) {
    /**
     * Identifier for this dialog
     */
    this.id = id;

    /**
     * Cache of settings
     * @member {object}
     */
    this.options = options;

    /**
     * Cache of jQuery object
     * @member {jQuery}
     * @private
     */
    this.$dlg = $(`#${id}`);

    let promise;
    if (this.$dlg.length === 0) {
      // HTML is not already present; load it asynchronously.
      promise = $.get(Platform.getFilePath(
        `html/${options.html || id}.html`))
      .then(html_code => {
        $("body").append(
          $(document.createElement("div"))
          .attr("id", id)
          .addClass("dialog")
          .html(html_code));
        this.$dlg = $(`#${id}`);
      });
    } else
      promise = Promise.resolve();

    promise
    .then(() => this.$dlg.dialog({
      title: options.title,
      width: 'auto',
      minWidth: 400,
      modal: true,
      open: () => {
        if (this.$dlg.data("dialog_created"))
          this.openDialog();
        else {
          this.$dlg.data("dialog_created", true);
          this.createDialog()
          .then(() => this.openDialog());
        }
      }
    }));
  }

  /**
   * Handle dialog creation once the HTML has been loaded, mainly
   * for associating handlers and loading background data. This is
   * invoked on an `open` event rather than `create` so we can be
   * sure all initialisation steps are complete before the dialog
   * opens.
   * Override in subclasses to attach handlers etc. Subclasses should
   * return super.createDialog()
   * @protected
   */
  createDialog() {
    this.$dlg
    .find("[data-i18n]")
    .i18n();

    this.$dlg
    .find("input[data-i18n-placeholder]")
    .each(function() {
      $(this).attr("placeholder", $.i18n(
        $(this).data("i18n-placeholder")));
    });

    this.$dlg
    .find("label[data-image]")
    .each(function() {
      $(this).css("background-image",
                  `url("${$(this).data('image')}")`);
    });

    // Using tooltips with a selectmenu is tricky.
    // Applying tooltip() to the select is useless, you have
    // to apply it to the span that is inserted as next
    // sibling after the select. However this span is not
    // created until some indeterminate time in the future,
    // and there is no event triggered.
    //
    // What we have to do is to wait until the selectmenus
    // have (hopefully!) been created before creating the
    // tooltips.
    const self = this;
    this.$dlg
    .find('select')
    .selectmenu()
    .on("selectmenuchange",
        function() {
          $(this).blur();
          self.$dlg.data("this").enableSubmit();
        });

    setTimeout(
      () => this.$dlg
      .find('select[data-i18n-tooltip] ~ .ui-selectmenu-button')
      .tooltip({
        items: ".ui-selectmenu-button",
        position: {
          my: "left+15 center",
          at: "right center",
          within: "body"
        },
        content: function() {
          return $.i18n(
            $(this)
            .prev()
            .data('i18n-tooltip'));
        }
      }),
      100);

    this.$dlg.find(".submit")
    .on("click", () => this.submit());

    this.enableSubmit();

    console.debug("Created", this.id);
    return Promise.resolve();
  }

  /**
   * Subclass to set any dynamic values from context.
   * Superclass must be called BEFORE subclass code.
   * @return {Promise} promise that resolves to undefined
   */
  openDialog() {
    console.debug("Opening", this.id);
    this.$dlg.data("this", this);
    return Promise.resolve(this);
  }

  /**
   * Validate fields to determine if submit can be enabled.
   * Override in subclasses.
   */
  canSubmit() {
    return true;
  }

  /**
   * Enable submit if field values allow it.
   * @protected
   */
  enableSubmit() {
    this.$dlg.find(".submit").prop(
      "disabled", !this.canSubmit());
  }

  /**
   * Populate a structure mapping field names to values.
   * @param {object} p optional hash of param values, so subclasses
   * can handle non-input type data.
   */
  getFieldValues(p)  {
    if (!p)
      p = {};
    this.$dlg
    .find("input[name],select[name],textarea[name]")
    .each(function() {
      let name = $(this).attr("name");
      let value;
      if (this.type === "checkbox")
        value = $(this).is(":checked") ? true : false;
      else if (this.type === "radio") {
        if (!$(this).is(":checked"))
          return;
        // Radio buttons are grouped by name, so use id
        name = this.id;
        value = true;
      } else if (this.type === "number") {
        value = parseInt($(this).val());
        if (isNaN(value))
          return;
      } else // text, password, email, <select, <textarea
        value = $(this).val() || $(this).text();
      //console.debug(name,"=",value);
      // Collect <input with the same name, and make arrays
      if (typeof p[name] === "undefined")
        p[name] = value;
      else if (typeof p[name] === "string")
        p[name] = [ p[name], value ];
      else
        p[name].push(value);
    });

    return p;
  }

  /**
   * Handle submit button
   * @param {object} vals optional hash of param values, so subclasses
   * can handle non-input type data.
   * @private
   */
  submit(vals) {
    this.$dlg.dialog("close");
    vals = this.getFieldValues(vals);

    if (this.options.onSubmit)
      this.options.onSubmit(this, vals);

    if (!this.options.postAction)
      return;

    // Note that password fields are sent as plain text. This is
    // not a problem so long as the comms are protected by HTTPS,
    // and is simpler/cleaner than using BasicAuth.
    // Some day we may implement OpenAuth, but there's no hurry.
    $.ajax({
      url: this.options.postAction,
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(vals)
    })
    .then(data => {
      if (typeof this.options.postResult === "function")
        this.options.postResult(data);
    })
    .catch(jqXHR => {
      // Note that the console sees an XML parsing error on a 401
      // response to /signin, due to the response body containing a
      // non-XML string ("Unauthorized"). It would be nice to catch
      // this gracefully and suppress the console print, but I can't
      // find any way to do that.
      if (typeof this.options.error === "function")
        this.options.error(jqXHR);
      else
        console.error(jqXHR.responseText);
    });
  }
}

export { Dialog }
