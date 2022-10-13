/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
  License MIT. See README.md at the root of this distribution for full copyright
  and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env browser, jquery */
/* global pluralRuleParser */

define([
  "socket.io-client",  "browser/Dialog", "platform", "common/Utils",
  "cldrpluralruleparser", // requirejs shim pulls in jquery.i18n

  "jquery", "jqueryui"
], (
  Sockets, Dialog, Platform, Utils, cldrpluralruleparser
) => {

  // Importing the AMD module for cldrpluralruleparser is not enough;
  // we have to set the global symbol too.
  pluralRuleParser = cldrpluralruleparser;

  /**
   * Common code shared between game and games interfaces
   */
  class UI {

    constructor() {
      /**
       * Are we using https?
       * @member {boolean}
       */
      this.usingHttps = document.URL.indexOf("https:") === 0;

      /**
       * Session object describing signed-in user
       * @member {object}
       */
      this.session = undefined;

      /**
       * Cache of defaults object, lateinit in build()
       */
      this.defaults = undefined;

      /**
       * Cache of Audio objects, indexed by name of clip.
       * Empty until a clip is played.
       */
      this.soundClips = {};
    }

    /**
     * Report an error returned from an ajax request.
     * @param {string|Error|array|jqXHR} args This will either be a
     * simple i18n string ID, or an array containing an i18n ID and a
     * series of arguments, or a jqXHR.
     */
    static report(args) {
      // Handle a jqXHR
      if (typeof args === "object") {
        if (args.responseJSON)
          args = args.responseJSON;
        else if (args.statusText)
          args = `Network error: ${args.statusText}`;
      }

      let message;
      if (typeof(args) === "string") // simple string
        message = $.i18n(args);
      else if (args instanceof Error) // Error object
        message = Utils.stringify(args);
      else if (args instanceof Array) { // First element i18n code
        message = $.i18n.apply($.i18n, args);
      } else // something else
        message = Utils.stringify(args);

      $("#alertDialog")
      .dialog({
        modal: true,
        title: $.i18n("XANADO problem")
      })
      .html(`<p>${message}</p>`);
    }

    /**
     * Play an audio clip, identified by id. Clips must be
     * pre-loaded in the HTML. Note that most (all?) browsers require
     * some sort of user interaction before they will play audio
     * embedded in the page.
     * @param {string} id name of the clip to play (no extension). Clip
     * must exist as an mp3 file in the /audio directory.
     */
    playAudio(id) {
      let audio = this.soundClips[id];

      if (!audio) {
        audio = new Audio(`/audio/${id}.mp3`);
        this.soundClips[id] = audio;
      }

      if (audio.playing)
        audio.pause();

      audio.play()
      .catch(() => {
        // play() can throw if the audio isn't loaded yet. Catching
        // canplaythrough might help (though it's really a bit of
        // overkill, as none of Xanado's audio is "important")
        $(audio).on(
          "canplaythrough",
          () => {
            $(audio).off("canplaythrough");
            audio.play()
            .catch(() => {
              // Probably no interaction yet
            });
          }, true);
      });
    }

    /**
     * Complete construction using promises
     * @return {Promise} promise that resolves when the UI is ready
     * @protected
     */
    create() {
      // Set up translations
      return $.get("/defaults")
      .then(defaults => this.defaults = defaults)
      .then(() => this.getSession())
      .then(() => $.get("/locales"))
      .then(locales => {
        const params = {};
        const ulang = this.getSetting("language") || "en";
        console.debug("User language", ulang);
        // Set up to load the language file
        params[ulang] = `/i18n/${ulang}.json`;
        // Select the language and load
        return $.i18n({ locale: ulang })
        .load(params)
        .then(() => locales);
      })
      .then(locales => {
        console.debug("Locales available", locales.join(", "));
        // Expand/translate strings in the HTML
        return new Promise(resolve => {
          $(document).ready(() => {
            console.debug("Translating HTML to", $.i18n().locale);
            $("body").i18n();
            resolve(locales);
          });
        });
      })
      .then(() => {
        $("button").button();
        $(document)
        .tooltip({
          items: "[data-i18n-tooltip]",
          content: function() {
            return $.i18n($(this).data("i18n-tooltip"));
          }
        });
      })
      .then(() => this.handleURLArguments())
      .then(() => {
        console.debug("Connecting to socket");
        // The server URL will be deduced from the request
        this.socket = Sockets.connect();
        this.attachSocketListeners();
      })
      .then(() => this.attachHandlers())
      .then(() => {
        $(".loading").hide();
        $(".waiting").removeClass("waiting");
      });
    }

    /**
     * Parse the URL used to load this page to extract parameters.
     * @return {Promise } promise that resolves to a key-value map
     */
    handleURLArguments() {
      const bits = document.URL.split("?");
      const urlArgs = {};
      if (bits.length > 1) {
        const sargs = bits[1].split(/[;&]/);
        for (const sarg of sargs) {
          const kv = sarg.split("=");
          urlArgs[decodeURIComponent(kv[0])] =
          decodeURIComponent(kv[1]);
        }
      }
      return Promise.resolve(urlArgs);
    }

    /**
     * Attach handlers for jquery and game events. This must NOT
     * attach socket handlers, just DOM object handlers.  Subclasses
     * should override this calling to super.attachHandlers() last.
     */
    attachHandlers() {
      // gear button
      $(".settingsButton")
      .on("click", () => {
        Dialog.open("SettingsDialog", {
          ui: this,
          postAction: "/session-settings",
          postResult: settings => {
            this.session.settings = settings;
            window.location.reload();
          },
          error: UI.report
        });
      });
    }

    /**
     * Called when a connection to the server is reported by the
     * socket. Use to update the UI to reflect the game state.
     * Implement in subclasses.
     * @abstract
     */
    readyToListen() {
      return Promise.reject("Not implemented");
    }

    /**
     * Attach socket communications listeners. Override in subclasses,
     * making sure to call super.attachSocketListeners()
     */
    attachSocketListeners() {

      Platform.assert(!this._socketListenersAttached);
      this._socketListenersAttached = true;

      let $reconnectDialog = null;

      // socket.io events 'new_namespace', 'disconnecting',
      // 'initial_headers', 'headers', 'connection_error' are not handled

      this.socket

      .on("connect", skt => {
        // Note: "connect" is synonymous with "connection"
        // Socket has connected to the server
        console.debug("--> connect");
        if ($reconnectDialog) {
          $reconnectDialog.dialog("close");
          $reconnectDialog = null;
        }
        this.readyToListen();
      })

      .on("disconnect", skt => {
        // Socket has disconnected for some reason
        // (server died, maybe?) Back off and try to reconnect.
        console.debug(`--> disconnect`);
        const mess = $.i18n("text-disconnected");
        $reconnectDialog = $("#alertDialog")
        .text(mess)
        .dialog({
          title: $.i18n("XANADO problem"),
          modal: true
        });
        setTimeout(() => {
          // Try and rejoin after a 3s timeout
          this.readyToListen()
          .catch(e => {
            console.debug(e);
            if (!$reconnectDialog)
              UI.report(mess);
          });
        }, 3000);
      });
    }

    /**
     * Identify the logged-in user
     * @return {Promise} a promise that resolves to the (redacted)
     * session object if someone is logged in, or undefined otherwise.
     */
    getSession() {
      $(".logged-in,.not-logged-in").hide();
      return $.get("/session")
      .then(session => {
         console.debug(`Signed in as '${session.name}'`);
        $(".not-logged-in").hide();
        $(".logged-in")
        .show()
        .find("span")
        .first()
        .text(session.name);
        this.session = session;
        return session;
      })
      .catch(e => {
        $(".logged-in").hide();
        $(".not-logged-in").show();
        if (typeof this.observer === "string")
          $(".observer").show().text($.i18n(
            "observer", this.observer));
        $(".not-logged-in>button")
        .on("click", () => Dialog.open("LoginDialog", {
          // postAction is set in code
          postResult: () => window.location.reload(),
          error: UI.report
        }));
        return undefined;
      });
    }

    /**
     * Get the current value for a setting. If a user is logged in, the
     * value will be taken from their session (and will default if it
     * is not defined).
     * @param {string} key setting to retrieve
     * @return {string|number|boolean} setting value
     */
    getSetting(key) {
      return (this.session && this.session.settings
              && typeof this.session.settings[key] !== "undefined")
      ? this.session.settings[key]
      : this.defaults[key];
    }

    getSettings() {
      return this.session && this.session.settings
      ? this.session.settings
      : this.defaults;
    }

    /**
     * Promise to check if we have been granted permission to
     * create Notifications.
     * @return {Promise} Promise that resolves to undefined if we can notify
     */
    canNotify() {
      if (!(this.usingHttps
            && this.getSetting("notification")
            && "Notification" in window))
        return Promise.reject();

      switch (Notification.permission) {
      case "denied":
        return Promise.reject();
      case "granted":
        return Promise.resolve();
      default:
        return new Promise((resolve, reject) => {
          return Notification.requestPermission()
          .then(result => {
            if (result === "granted")
              resolve();
            else
              reject();
          });
        });
      }
    }

    /**
     * Generate a notification using the HTML5 notifications API
     * @param {string} title i18n notification title id
     * @param {string} body i18n notification body id
     * @param [...] arguments to i18n body id
     */
    notify() {
      const args = Array.from(arguments);
      const title = $.i18n(args.shift());
      const body = $.i18n.call(args);
      this.canNotify()
      .then(() => {
        this.cancelNotification();
        const notification = new Notification(
          title,
          {
            icon: "/images/favicon.ico",
            body: body
          });
        this._notification = notification;
        $(notification)
        .on("click", function () {
          this.cancel();
        })
        .on("close", () => {
          delete this._notification;
        });
      })
      .catch(() => {});
    }

    /**
     * Cancel any outstanding Notification
     */
    cancelNotification() {
      if (this._notification) {
        this._notification.close();
        delete this._notification;
      }
    }
  }

  return UI;
});
