/*Copyright (C) 2022 The Xanado Project https://github.com/cdot/Xanado
License MIT. See README.md at the root of this distribution for full copyright
and license information. Author Crawford Currie http://c-dot.co.uk*/
/* eslint-env node */

if (typeof requirejs === "undefined") {
  throw new Error(__filename + " is not runnable stand-alone");
}

define([
  "common/Channel"
], (
  Channel
) => {

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

  class TestSocket extends Channel {
    resolve;
    reject;
    finished;
    sawError;
    idNum = 0;

    // @override
    emit(event, data, nomore) {
      if (this.connection && !nomore) // connection to another socket?
        this.connection.emit(event, data, true);
      else {
        try {
          if (this.handlers[event] && this.handlers[event].length > 0)
            this.handlers[event].forEach(l => l(data, event, this.idNum));
          else if (this.handlers["*"] && this.handlers['*'].length > 0)
            this.handlers["*"].forEach(l => l(data, event, this.idNum));
          this.idNum++;
        } catch (e) {
          //console.error("ERROR", e);
          this.sawError = e;
          this.done();
          throw e;
        }
      }
    }

    // Couple to another TestSocket
    connect(endPoint) {
      assert(!this.connection);
      assert(!endPoint.connection);
      this.connection = endPoint;
      endPoint.connection = this;
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
