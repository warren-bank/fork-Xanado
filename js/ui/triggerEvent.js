/* eslint-env browser, jquery */

/**
 * Browser implementation of triggerEvent
 */
define("triggerEvent", () => {
	return (e, args) => $(document).trigger(e, args);
});
