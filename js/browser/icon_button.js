/*@preserve Copyright (C) 2017-2019 Crawford Currie http://c-dot.co.uk license MIT*/
/* eslint-env browser,jquery */

/**
 * Mini-widget that extends the jquery button widget to simplify using
 * buttons with images for icons. The "icon" option is extended to detect
 * if the icon-name starts with "ui-icon-" and if not, assumes the icon
 * is defined by a CSS class. It also supports specifying the icon name via
 * a data-icon= attribute in HTML.
 */
define("js/jq/icon_button", ["jquery-ui"], function () {
    $.widget("squirrel.icon_button", $.ui.button, {
        _create: function () {
            this.options.icon = this.options.icon || this.element.data("icon");
            if (this.options.icon && !/^ui-icon-/.test(this.options.icon)) {
                this.options.icons = {
                    primary: this.options.icon
                };
                this.options.classes = {
                    "ui-button-icon": "squirrel-icon"
                };
                delete this.options.icon;
            }
            this.options.text = false;
            this._super();
        },

        _setOption: function (option, value) {
            if (option === "icon" && !/^ui-icon-/.test(value)) {
                option = "icons";
                value = {
                    primary: value
                }
            }
            this._super(option, value);
        }
    });
});
