/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

if (typeof requirejs === "undefined") {
  throw new Error(__filename + " is not runnable stand-alone");
}

define([], () => {

  const assert = require("assert");

  /**
   * Simulator for socket.io, replaces the socket functionality with a
   * simple callback that can be used in tests to monitor expected
   * events. Pattern:
   * tr.addTest("example", () => {
   *   const socket = new TestSocket();
   *   socket.on("event", (data, event) => {
   *     // handle expected events. When last event seen, call socket.done()
   *   }
   *   return new Promise((resolve, reject) => {
   *     ... code that generates events ...
   *   })
   *   .then(() => socket.wait());
   * });
   */

  class TestSocket {
    listeners = {};
    resolve;
    reject;
    finished;
    sawError;

    _emit(event, data) {
      try {
        if (this.listeners[event] && this.listeners[event].length > 0)
          this.listeners[event].forEach(l => l(data, event));
        else if (this.listeners["*"])
          this.listeners["*"].forEach(l => l(data, event));
      } catch (e) {
        //console.error("EMIT ERROR", e);
        this.sawError = e;
        this.done();
      }
    }

    /** Simulate socket.io */
    emit(event, data) {
      if (data && data.messageID)
        data = data.data;
      if (this.connection)
        this.connection._emit(event, data);
      else
        this._emit(event, data);
    }

    // Couple to another TestSocket
    connect(endPoint) {
      assert(!this.connection);
      assert(!endPoint.connection);
      this.connection = endPoint;
      endPoint.connection = this;
    }
    
    /**
     * Register a listener for the given event. Pass "*" for the event
     * for a catch-all handler that will handle any events not
     * otherwise handled.
     */
    on(event, listener) {
      if (this.listeners[event])
        this.listeners[event].push(listener);
      else
        this.listeners[event] = [listener];
      return this;
    }

    /**
     * Wait for the socket to be marked as `done()`. This will normally
     * be after all the expected messages have been received. If done()
     * is never called, then mocha will eventually time out.
     */
    wait() {
      if (this.finished)
        return Promise.resolve();
      return new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }

    /**
     * Mark the socket as `done`. The socket must be sitting in `wait()`
     * when done() is called, or it will error out.
     */
    done() {
      if (this.finished)
        return;
      this.finished = true;
      if (this.connection)
        this.connection.done();
      if (this.sawError) {
        if (this.reject)
          this.reject(this.sawError);
        else
          throw this.sawError;
      } else if (this.resolve)
        this.resolve();
    }

  }

  return TestSocket;
});
