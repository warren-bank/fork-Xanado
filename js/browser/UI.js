/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env browser, jquery */

define('browser/UI', [
	'socket.io',  'browser/Dialog'
], (
	io, Dialog
) => {

	/**
	 * Common code shared between game and games interfaces
	 */
	class UI {

		/**
		 * Report an error returned from an ajax request.
		 * @param {string|Error|array|jqXHR} args This will either be a
		 * simple i18n string ID, or an array containing an i18n ID and a
		 * series of arguments, or a jqXHR.
		 * @private
		 * @static
		 */
		report(args) {
			// Handle a jqXHR
			if (typeof args === 'object') {
				if (args.responseJSON)
					args = args.responseJSON;
				else if (args.responsetext)
					args = args.responseJSON;
			}

			let message;
			if (typeof(args) === 'string') // simpe string
				message = $.i18n(args);
			else if (args instanceof Error) // Error object
				message = args.toString();
			else if (args instanceof Array) { // First element i18n code
				message = $.i18n.apply($.i18n, args);
			} else // something else
				message = args.toString();

			$('#alertDialog')
			.text(message)
			.dialog({
				modal: true,
				title: $.i18n("XANADO problem")
			});
		}

		/**
		 * Play an audio clip, identified by #id. Clips must be
		 * pre-loaded in the HTML. Note that most (all?) browsers require
		 * some sort of user interaction before they will play audio
		 * embedded in the page.
		 * @private
		 * @static
		 */
		playAudio(id) {
			const audio = document.getElementById(id);

			if (audio.playing)
				audio.pause();

			audio.defaultPlaybackRate = 1;
			audio.volume = 1;

			try {
				audio.currentTime = 0;
				audio.play();
			}
			catch(e) {
				const currentTime = () => {
					audio.currentTime = 0;
					audio.removeEventListener('canplay', currentTime, true);
					audio.play();
				};
				audio.addEventListener('canplay', currentTime, true);
			}
		}

		constructor() {
			/**
			 * Are we using https?
			 * @member {boolean}
			 */
			this.usingHttps = document.URL.indexOf('https:') === 0;

			/**
			 * Current user preference settings. Will be updated when
			 * session is known.
			 * @member {object}
			 */
			this.settings = {
				// Notification requires https
				notification: this.usingHttps,
				theme: "default"
			};

			$("button").button();

			/**
			 * Session object describing signed-in user
			 * @member {object}
			 */
			this.session = undefined;

			// gear button
			$('#settingsButton')
			.on('click', () => {
				const curTheme = this.getSetting('theme');
				Dialog.open("SettingsDialog", {
					settings: this.getSettings(),
					postAction: "/session-prefs",
					postResult: prefs => {
						if (prefs.theme === curTheme)
							this.setSettings(prefs);
						else
							window.location.reload();
					},
					error: UI.report
				});
			});

			if (!this.usingHttps) {
				// Notification requires https
				$("input.setting[data-set='notification']")
				.prop('disabled', true);
			}

			this.socket = io.connect(null);

			$(document)
			.tooltip({
				items: '[data-i18n-tooltip]',
				content: function() {
					return $.i18n($(this).data('i18n-tooltip'));
				}
			});
		}

		/**
		 * Subclass to add synchrnous steps to the UI build process.
		 * Always call super.build() last in the promise chain.
		 * @return {Promise}
		 */
		build() {
			return new Promise(resolve => {
				$(".user-interface").show();
				resolve();
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

		getSetting(key) {
			if (!(this.session && this.session.settings))
				return undefined;
			return this.session.settings[key];
		}

		getSettings() {
			return this.session.settings;
		}

	}

	return UI;
});
