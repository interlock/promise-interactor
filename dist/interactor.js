"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = __importDefault(require("process"));
const promise_1 = require("./promise");
const states_1 = require("./states");
exports.resolveSym = Symbol('resolve');
exports.rejectSym = Symbol('reject');
function isIAfter(object) {
    return 'after' in object;
}
exports.isIAfter = isIAfter;
function isIBefore(object) {
    return 'before' in object;
}
exports.isIBefore = isIBefore;
function isIRollback(object) {
    return 'rollback' in object;
}
exports.isIRollback = isIRollback;
function isResolve(object) {
    return object != null;
}
function isReject(object) {
    return object != null;
}
/**
 * Interactor wraps business logic in a promise friendly package.
 */
class Interactor {
    /**
     * context is where our inputs and outputs for this business logic
     * should live.
     * @param {object} context
     */
    constructor(context) {
        this._state = states_1.States.NEW;
        this.context = context || {};
        this.promise = null;
        this._state = states_1.States.NEW;
        this[exports.resolveSym] = null;
        this[exports.rejectSym] = null;
        this.resolve = this.resolve.bind(this);
        this.reject = this.reject.bind(this);
        this.resolveCalled = false;
        this.rejectCalled = false;
    }
    set state(newState) {
        this._state = newState;
    }
    get state() {
        return this._state;
    }
    /**
     * A static shortcut to creating an instance and calling exec.
     * @param {object} context
     * @returns {Interactor}
     */
    static exec(context) {
        const instance = new this(context);
        return instance.exec();
    }
    /**
     * Run this interactor
     * @returns {Interactor}
     */
    exec() {
        this.promise = new Promise((resolve, reject) => {
            this[exports.resolveSym] = resolve;
            this[exports.rejectSym] = reject;
            let root = Promise.resolve();
            if (isIBefore(this)) {
                this.state = states_1.States.BEFORE;
                const beforePromise = this.before();
                if (promise_1.isPromise(beforePromise)) {
                    root = beforePromise;
                }
            }
            root.then(() => {
                this.state = states_1.States.CALL;
                this.call();
                return null;
            }).catch((err) => {
                this.reject(err);
            });
        });
        return this.promise;
    }
    /**
     * Abstract method that should be implemented in the child
     */
    call() {
        throw new Error('Interactor requires call to be implemented');
    }
    /**
     * Access to the promise resolve, should be called from call() on success
     */
    resolve() {
        if (this.rejectCalled) {
            process_1.default.emitWarning('Promise Interactor reject already called before resolve');
        }
        if (this.resolveCalled) {
            process_1.default.emitWarning('Promise Interactor resolve called multiple times');
        }
        this.resolveCalled = true;
        if (isIAfter(this)) {
            this.state = states_1.States.AFTER;
            const afterPromise = this.after();
            if (promise_1.isPromise(afterPromise) === true && afterPromise !== undefined) {
                afterPromise.then(() => {
                    this.state = states_1.States.RESOLVED;
                    this.callResolve();
                    return null;
                }).catch(this.reject);
                return;
            }
        }
        this.state = states_1.States.RESOLVED;
        this.callResolve();
    }
    /**
     * Access to the promise reject, should be called from call() on failure
     * Also, optionally calls instance method rollback it defined.
     * @param {*} err
     */
    reject(err) {
        if (this.resolveCalled) {
            process_1.default.emitWarning('Promise Interactor resolve already called before reject');
        }
        if (this.rejectCalled) {
            process_1.default.emitWarning('Promise Interactor reject called multiple times');
        }
        this.rejectCalled = true;
        if (isIRollback(this) && (this.state === states_1.States.CALL || this.state === states_1.States.RESOLVED)) {
            this.state = states_1.States.ROLLBACK;
            const rollbackPromise = this.rollback(err);
            if (promise_1.isPromise(rollbackPromise)) {
                rollbackPromise.then(() => {
                    this.callReject(err);
                    return null;
                }).catch((newErr) => {
                    this.callReject(newErr);
                });
                return; // early exit
            }
        }
        this.state = states_1.States.REJECTED;
        this.callReject(err);
    }
    callResolve() {
        const r = this[exports.resolveSym];
        if (isResolve(r)) {
            r(this);
        }
        else {
            process_1.default.emitWarning('Attempt to call Promise Interactor resolve before it was initialized');
        }
    }
    callReject(err) {
        const r = this[exports.rejectSym];
        if (isReject(r)) {
            r(err);
        }
        else {
            process_1.default.emitWarning('Attempt to call Promise Interactor reject before it was initialized');
        }
    }
}
exports.Interactor = Interactor;
