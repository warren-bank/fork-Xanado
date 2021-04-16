/*@preserve Copyright (C) 2015-2019 Crawford Currie http://c-dot.co.uk license MIT*/
/*eslint-env browser,node,mocha*/
/*global Mocha:writable*/

if (typeof requirejs === "undefined") {
    throw new Error(__filename + " is not runnable stand-alone");
}

/**
* Common code for running mocha tests
*/
define("test/TestRunner", ["mocha", "chai"], function(maybeMocha, chai) {
	/*eslint-disable no-global-assign*/
    if (typeof Mocha === "undefined")
        Mocha = maybeMocha; // node.js
	/*eslint-enable no-global-assign*/

    class TestRunner {
        constructor(title, debug) {
            this.assert = chai.assert;
            if (typeof global !== "undefined")
                this.mocha = new Mocha({ reporter: 'spec' });
            else
                this.mocha = new Mocha({ reporter: 'html' });
            if (typeof title === "string")
                this.mocha.suite.title = title;
            this.debug = debug;
        }

        beforeEach(before) {
            this.before = before;
        }

        afterEach(after) {
            this.after = after;
        }

        deTest(/*title, fn*/) {
        }

        addTest(title, fn) {
            let self = this;
            let test = new Mocha.Test(title, function() {
                if (typeof self.before === "function")
                    self.before();
                let res = fn.call(this);
                if (res instanceof Promise) {
                    return res.then(() => {
                        if (typeof self.after === "function")
                            self.after();
                    });
                }
                else if (typeof self.after === "function")
                    self.after()
            });
            this.mocha.suite.addTest(test);
        }

        run() {
            return new Promise((resolve) => {
                this.mocha.timeout(10000);
                this.mocha.run(resolve);
            });
        }
    }

    return TestRunner;
});
