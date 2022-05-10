// requiresjs configuration shared between all HTML
// Note that paths must be relative to the root of the distribution. Because of
// way requirejs works, that means this file also has to be in the root of the
// distribution.
// See https://coderwall.com/p/qbh0_w/share-requirejs-configuration-among-multiple-pages
/*global rjs_main*/

requirejs.config({
	baseUrl: '../..',
	paths: {
		jquery: '/node_modules/jquery/dist/jquery.min',
		
		jqueryui: '/node_modules/jquery-ui-dist/jquery-ui.min',
		
		i18n: '/node_modules/@wikimedia/jquery.i18n/src/jquery.i18n',
		
		i18n_emitter:
		'/node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.emitter',

		i18n_fallbacks:
		'/node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks',

		i18n_language:
		'/node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.language',

		i18n_messagestore:
		'/node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.messagestore',
		
		i18n_parser:
		'/node_modules/@wikimedia/jquery.i18n/src/jquery.i18n.parser',
		
		touchpunch:
		'/node_modules/jquery-ui-touch-punch/jquery.ui.touch-punch.min',
		
		'socket.io': '/node_modules/socket.io/client-dist/socket.io',

		cookie: '/node_modules/jquery.cookie/jquery.cookie',

		pluralRuleParser:
		'/js/browser/cldrpluralruleparser',

		browser: '/js/browser',
		game: '/js/game',
		dawg: '/js/dawg',
		platform: '/js/browser/BrowserPlatform'
	},
	
	shim: {
		jqueryui: ['jquery'],
		i18n: ['jquery'],
		i18n_emitter: ['i18n'],
		i18n_fallbacks: ['i18n'],
		i18n_language: ['i18n'],
		i18n_messagestore: ['i18n'],
		i18n_parser: ['i18n']
	}
});

if (typeof rjs_main !== "undefined")
	requirejs([rjs_main]);
