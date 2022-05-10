/*Copyright (C) 2019-2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information*/
/* eslint-env browser, jquery */

define('browser/UI', [
	'socket.io',  'browser/Dialog',

	'jquery',
	'jqueryui',
	'i18n',
	'i18n_emitter',
	'i18n_fallbacks',
	'i18n_language',
	'i18n_messagestore',
	'i18n_parser',
	'pluralRuleParser'
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
		 */
		static report(args) {
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
		 */
		static playAudio(id) {
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
			 * Session object describing signed-in user
			 * @member {object}
			 */
			this.session = undefined;

			/**
			 * Cache of defaults object, lateinit in build()
			 */
			this.defaults = undefined;
		}

		/**
		 * Complete construction using promises
		 * @return {Promise} promise that resolves when the UI is ready
		 * @protected
		 */
		build() {
			this.socket = io.connect(null);
			return Promise.all([
				$.get('/locales')
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
					console.log('Locales available', locales.join(', '));
					// Expand/translate strings in the HTML
					return new Promise(resolve => {
						$(document).ready(() => {
							console.log('Translating HTML to', $.i18n().locale);
							$('body').i18n();
							resolve(locales);
						});
					});
				}),
				$.get("/defaults")
				.then(defaults => {
					this.defaults = defaults;
					// Notification requires https
					if (!this.usingHttps)
						this.defaults.notification = false;
				})
			])
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
			$("button").button();

			// gear button
			$('#settingsButton')
			.on('click', () => {
				const curTheme = this.getSetting('theme');
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
				items: '[data-i18n-tooltip]',
				content: function() {
					return $.i18n($(this).data('i18n-tooltip'));
				}
			});

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

		/**
		 * Get the current value for a setting. If a user is logged in, the
		 * value will be taken from their session (and will default if it
		 * is not defined).
		 * @param {string} key setting to retrieve
		 * @return {string|number|boolean} setting value
		 */
		getSetting(key) {
			return (this.session && this.session.settings
					&& typeof this.session.settings[key] !== 'undefined')
			? this.session.settings[key]
			: this.defaults[key];
		}

		getSettings() {
			return this.session && this.session.settings
			? this.session.settings
			: this.defaults;
		}

	}

	return UI;
});
