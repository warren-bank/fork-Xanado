/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env browser, jquery */

define("browser/UI", [
	"socket.io",  "browser/Dialog",

	"jquery",
	"jqueryui",
	"i18n",
	"i18n_emitter",
	"i18n_fallbacks",
	"i18n_language",
	"i18n_messagestore",
	"i18n_parser",
	"pluralRuleParser"
], (
	io, Dialog
) => {

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
				message = args.toString();
			else if (args instanceof Array) { // First element i18n code
				message = $.i18n.apply($.i18n, args);
			} else // something else
				message = args.toString();

			$("#alertDialog")
			.dialog({
				modal: true,
				title: $.i18n("XANADO problem")
			})
			.append(`<p>${message}</p>`);
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

			try {
				audio.play();
			}
			catch(e) {
				$(audio).on("canplaythrough", 
					() => {
						$(audio).off("canplaythrough");
						audio.play();
					}, true);
			}
		}

		/**
		 * Complete construction using promises
		 * @return {Promise} promise that resolves when the UI is ready
		 * @protected
		 */
		build() {
			return Promise.all([
				$.get("/locales")
				.then(locales => {
					const params = {};
					locales.forEach(locale => {
						params[locale] = `/i18n/${locale}.json`;
					});
					// Note: without other guidance, i18n will use the locale
					// already in the browser - which is fine by us!
					return $.i18n().load(params).then(() => locales);
				})
				.then(locales => {
					console.log("Locales available", locales.join(", "));
					// Expand/translate strings in the HTML
					return new Promise(resolve => {
						$(document).ready(() => {
							console.log("Translating HTML to", $.i18n().locale);
							$("body").i18n();
							resolve(locales);
						});
					});
				}),
				$.get("/defaults")
				.then(defaults => this.defaults = defaults)
			])
			.then(() => $("button").button())
			.then(() => this.decorate());
		}

		/**
		 * Once the locales and defaults have been loaded, decorate the
		 * UI with shared functionality. Subclasses should override this
		 * and end the promise chain with a call to super.decorate()
		 * @return {Promise} promise that resolves when decoration is
		 * complete and the UI is ready.
		 */
		decorate() {
			// gear button
			$("#settingsButton")
			.on("click", () => {
				const curTheme = this.getSetting("theme");
				Dialog.open("SettingsDialog", {
					ui: this,
					postAction: "/session-settings",
					postResult: settings => {
						if (settings.theme === curTheme)
							this.setSettings(settings);
						else
							window.location.reload();
					},
					error: UI.report
				});
			});

			$(document)
			.tooltip({
				items: "[data-i18n-tooltip]",
				content: function() {
					return $.i18n($(this).data("i18n-tooltip"));
				}
			});

			console.debug("Connecting to socket");
			this.socket = io.connect(null);
			let $reconnectDialog = null;
			this.socket
			.on("connect", skt => {
				// Note: "connect" is synonymous with "connection"
				// Socket has connected to the server
				console.debug("--> connect");
				if ($reconnectDialog) {
					$reconnectDialog.dialog("close");
					$reconnectDialog = null;
				}
				this.connectToServer();
			})

			.on("disconnect", skt => {
				// Socket has disconnected for some reason
				// (server died, maybe?) Back off and try to reconnect.
				console.debug(`--> disconnect`);
				const mess = $.i18n("Server disconnected, trying to reconnect");
				$reconnectDialog = $("#alertDialog")
				.text(mess)
				.dialog({
					title: $.i18n("XANADO problem"),
					modal: true
				});
				setTimeout(() => {
					// Try and rejoin after a 3s timeout
					this.connectToServer()
					.catch(e => {
						console.debug(e);
						if (!$reconnectDialog)
							UI.report(mess);
					});
				}, 3000);

			});

			this.attachSocketListeners(this.socket);

			return new Promise(resolve => {
				$(".user-interface").show();
				resolve();
			});
		}

		/**
		 * Called when a connection to the server is reported by the
		 * socket. Use to update the UI to reflect the game state.
		 * Implement in subclasses.
		 */
		connectToServer() {
			return Promise.reject("Not implemented");
		}

		/**
		 * Attach socket communications listeners. Implement in subclasses.
		 * @param {Socket} communications socket
		 */
		attachSocketListeners(socket) {
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
 				console.debug("Signed in as", session.name);
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
				$(".not-logged-in").show()
				.find("button")
				.on("click", () => Dialog.open("LoginDialog", {
					postResult: () => location.replace(location),
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
		 * @param {string} id notification id
		 */
		notify() {
			const args = Array.from(arguments);
			const id = args[0];
			args[0] = `ui-notify-title-${id}`;
			const title = $.i18n.call(args);
			args[0] = `ui-notify-body-${id}`;
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
