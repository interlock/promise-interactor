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
      this.call();
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
    this[resolveSym](this);
  }

  /**
   * Access to the promise reject, should be called from call() on failure
   * Also, optionally calls instance method rollback it defined.
   * @param {*} err 
   */
  reject(err) {
    if (typeof this.rollback === 'function') {
      const rollbackPromise = this.rollback();
      if (rollbackPromise instanceof Promise === true) {
        rollbackPromise.finally(() => {
          this[rejectSym](err);
        });
        return; // early exit
      }
    }
    this[rejectSym](err);
  }
}

module.exports = Interactor;
