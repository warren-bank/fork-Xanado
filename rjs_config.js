// requiresjs configuration shared between all HTML
// Note that paths must be relative to the root of the distribution. Because of
// way requirejs works, that means this file also has to be in the root of the
// distribution.
// See https://coderwall.com/p/qbh0_w/share-requirejs-configuration-among-multiple-pages

requirejs.config({
	paths: {
		"socket.io": "//cdnjs.cloudflare.com/ajax/libs/socket.io/3.1.2/socket.io",
		jquery: "//cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min",
		"touch-punch": "//cdnjs.cloudflare.com/ajax/libs/jqueryui-touch-punch/0.2.3/jquery.ui.touch-punch.min",
		"jquery-ui": "//cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min",
		cookie: "//cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min",

		icebox: "js/repaired_icebox",
		
		server: "js/server",
		ui: "js/ui",
		game: "js/game",
		// use browser version of triggerEvent ($.trigger)
		triggerEvent: "js/ui/triggerEvent"
	}
});
