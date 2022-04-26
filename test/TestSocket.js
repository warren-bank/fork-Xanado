/*@preserve Copyright (C) 2022 Crawford Currie http://c-dot.co.uk license MIT*/
/* eslint-env node */

if (typeof requirejs === "undefined") {
	throw new Error(__filename + " is not runnable stand-alone");
}

define("test/TestSocket", [], () => {

	/**
	 * Simulator for socket.io, replaces the socket functionality with a
	 * simple callback that can be used in tests to monitor expected
	 * events. Pattern:
	 * tr.addTest('example', () => {
	 *   const socket = new TestSocket();
	 *   socket.on('event', (event, data) => {
	 *     // handle expected events. When last event seen, call socket.done()
	 *   }
	 *   return new Promise((resolve, reject) => {
	 *     ... code that generates events ...
	 *   })
     *   .then(() => socket.wait());
	 * });
	 */
	class TestSocket {
		constructor() {
			this.player = undefined;
			this.listeners = {};
			this.resolve = undefined;
			this.reject = undefined;
			this.finished = false;
			this.sawError = undefined;
		}

		/**
		 * Simulate socket.io
		 */
		emit(event, data) {
			try {
				if (this.listeners[event] && this.listeners[event].length > 0) {
					this.listeners[event].forEach(l => l(event, data));
				} else if (this.listeners['*'])
					this.listeners['*'].forEach(l => l(event, data));
			} catch (e) {
				console.error(e);
				this.sawError = e;
				this.done();
			}
		}

		/**
		 * Register a listener for the given event. Pass '*' for the event
		 * for a catch-all handler that will handle any events not
		 * otherwise handled.
		 */
		on(event, listener) {
			if (this.listeners[event])
				this.listeners[event].push(listener);
			else
				this.listeners[event] = [listener];
		}

		/**
		 * Mark the socket as 'done'. The socket must be sitting in 'wait()'
		 * when done() is called, or it will error out.
		 */
		done() {
			this.finished = true;
			if (this.sawError && this.reject)
				this.reject(this.sawError);
			else if (this.resolve)
				this.resolve();
		}

		/**
		 * Wait for the socket to be marked as 'done()'. This will normally
		 * be after all the expected messages have been received. If done()
		 * is never called, then TestRunner will eventually time out.
		 */
		wait() {
			if (this.finished)
				return Promise.resolve();
			return new Promise((resolve, reject) => {
				this.resolve = resolve;
				this.reject = reject;
			});
		}
	}

	return TestSocket;
});

