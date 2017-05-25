const Promise = require('bluebird');
const promise = require('./promise');

const resolveSym = Symbol.for('resolve');
const rejectSym = Symbol.for('reject');

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
    this.resolve = this.resolve.bind(this);
    this.reject = this.reject.bind(this);
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

  set state(newState) {
    this._state = newState;
  }

  get state() {
    return this._state;
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
        this.state = 'BEFORE';
        const beforePromise = this.before();
        if (promise.isPromise(beforePromise) === true) {
          this.root = beforePromise;
        }
      }
      root.then(() => {
        this.state = 'CALL';
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
      this.state = 'AFTER';
      const afterPromise = this.after();
      if (promise.isPromise(afterPromise) === true) {
        afterPromise.then(() => {
          this.state = 'RESOLVED';
          this[resolveSym](this);
        }).catch(this.reject);
        return;
      }
    }
    this.state = 'RESOLVED';
    this[resolveSym](this);
  }

  /**
   * Access to the promise reject, should be called from call() on failure
   * Also, optionally calls instance method rollback it defined.
   * @param {*} err
   */
  reject(err) {
    if (typeof this.rollback === 'function' && this.state == 'CALL') {
      const rollbackPromise = this.rollback(err);
      if (promise.isPromise(rollbackPromise) === true) {
        rollbackPromise
        .then(() => {
          this[rejectSym](err);
        })
        .catch((newErr) => {
          this[rejectSym](newErr);
        });
        return; // early exit
      }
    }
    this.state = 'REJECTED';
    this[rejectSym](err);
  }
}

module.exports = Interactor;
