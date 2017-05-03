const Promise = require('bluebird');

const resolveSym = Symbol('resolve');
const rejectSym = Symbol('reject');

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
        this.context = context || {};
        this.promise = null;
        this._state = 'NEW';
        this[resolveSym] = null;
        this[rejectSym] = null;
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
            this[resolveSym] = resolve;
            this[rejectSym] = reject;
            let root = Promise.resolve();
            if (typeof this.before === 'function') {
                this._state = 'BEFORE';
                const beforePromise = this.before();
                if (beforePromise instanceof Promise === true) {
                    this.root = beforePromise;
                }
            }
            root.then(() => {
                this._state = 'CALL';
                this.call();
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
        if (typeof this.after === 'function') {
            this._state = 'AFTER';
            const afterPromise = this.after();
            if (afterPromise instanceof Promise === true) {
                afterPromise.then(() => {
                    this._state = 'RESOLVED';
                    this[resolveSym](this);
                }).catch(this.reject);
                return;
            }
        }
        this._state = 'RESOLVED';
        this[resolveSym](this);
    }

  /**
   * Access to the promise reject, should be called from call() on failure
   * Also, optionally calls instance method rollback it defined.
   * @param {*} err
   */
    reject(err) {
        if (typeof this.rollback === 'function' && this._state == 'CALL') {
            const rollbackPromise = this.rollback();
            if (rollbackPromise instanceof Promise === true) {
                rollbackPromise.finally(() => {
                    this[rejectSym](err);
                });
                return; // early exit
            }
        }
        this._state = 'REJECTED';
        this[rejectSym](err);
    }
}

module.exports = Interactor;
