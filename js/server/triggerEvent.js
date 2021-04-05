/* See README.md at the root of this distribution for copyright and
   license information */
/* eslint-env amd, node */

/**
 * node.js implementation of triggerEvent
 */
define("triggerEvent", ["events"],  (Events) => {

	const emitter = new Events.EventEmitter();
	
	return (e, args) => emitter.emit(e, args);
});
