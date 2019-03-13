import process from 'process';
import { isPromise } from './promise';
import { States } from './states';

export const resolveSym = Symbol('resolve');
export const rejectSym = Symbol('reject');

interface IAfter {
  after(): Promise<any>;
}

export function isIAfter(object: any): object is IAfter {
  return 'after' in object;
}

export interface IBefore {
  before(): Promise<any>;
}

export function isIBefore(object: any): object is IBefore {
  return 'before' in object;
}

interface IRollback {
  rollback(error?: Error): Promise<any>;
}

export function isIRollback(object: any): object is IRollback {
  return 'rollback' in object;
}

/**
 * Interactor wraps business logic in a promise friendly package.
 */
export class Interactor {

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
  public static exec(context: any): Promise<any> {
    const instance = new this(context);
    return instance.exec();
  }

  public context: any;

  public promise: Promise<any> | any;

  protected [resolveSym]: any;

  protected [rejectSym]: any;

  private _state: States = States.NEW;

  private resolveCalled: boolean;

  private rejectCalled: boolean;

  /**
   * context is where our inputs and outputs for this business logic
   * should live.
   * @param {object} context
   */
  constructor(context: any) {
    this.context = context || {};
    this.promise = null;
    this._state = States.NEW;
    this[resolveSym] = null;
    this[rejectSym] = null;
    this.resolve = this.resolve.bind(this);
    this.reject = this.reject.bind(this);
    this.resolveCalled = false;
    this.rejectCalled = false;

  }

  /**
   * Run this interactor
   * @returns {Interactor}
   */
  public exec(): Promise<any> {
    this.promise = new Promise((resolve, reject) => {
      this[resolveSym] = resolve;
      this[rejectSym] = reject;
      let root = Promise.resolve();
      if (isIBefore(this)) {
        this.state = States.BEFORE;
        const beforePromise = this.before();
        if (isPromise(beforePromise) === true) {
          root = beforePromise;
        }
      }
      root.then(() => {
        this.state = States.CALL;
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
  public call() {
    throw new Error('Interactor requires call to be implemented');
  }

  /**
   * Access to the promise resolve, should be called from call() on success
   */
  protected resolve() {
    if (this.rejectCalled) {
      process.emitWarning('Promise Interactor reject already called before resolve');
    }
    if (this.resolveCalled) {
      process.emitWarning('Promise Interactor resolve called multiple times');
    }
    this.resolveCalled = true;
    if (isIAfter(this)) {
      this.state = States.AFTER;
      const afterPromise = this.after();
      if (isPromise(afterPromise) === true && afterPromise !== undefined) {
        afterPromise.then(() => {
          this.state = States.RESOLVED;
          this[resolveSym](this);
          return null;
        }).catch(this.reject);
        return;
      }
    }
    this.state = States.RESOLVED;
    this[resolveSym](this);
  }

  /**
   * Access to the promise reject, should be called from call() on failure
   * Also, optionally calls instance method rollback it defined.
   * @param {*} err
   */
  protected reject(err: Error) {
    if (this.resolveCalled) {
      process.emitWarning('Promise Interactor resolve already called before reject');
    }
    if (this.rejectCalled) {
      process.emitWarning('Promise Interactor reject called multiple times');
    }
    this.rejectCalled = true;
    if (isIRollback(this) && (this.state === States.CALL || this.state === States.RESOLVED)) {
      this.state = States.ROLLBACK;
      const rollbackPromise = this.rollback(err);
      if (isPromise(rollbackPromise) === true) {
        rollbackPromise.then(() => {
          this[rejectSym](err);
          return null;
        }).catch((newErr: Error) => {
          this[rejectSym](newErr);
        });
        return; // early exit
      }
    }
    this.state = States.REJECTED;
    this[rejectSym](err);
  }
}
