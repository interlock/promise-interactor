import process from 'process';
import { IReject, IResolve, isPromise } from './promise';
import { States } from './states';

export const resolveSym = Symbol('resolve');
export const rejectSym = Symbol('reject');

export type interactorConstructor<T extends object> = new (context: T) => Interactor<T>;

export interface IAfter {
  after(): Promise<any> | void;
}

export function isIAfter(object: any): object is IAfter {
  return 'after' in object;
}

export interface IBefore {
  before(): Promise<any> | void;
}

export function isIBefore(object: any): object is IBefore {
  return 'before' in object;
}

export interface IRollback {
  rollback(error?: Error): Promise<any> | void;
}

export function isIRollback(object: any): object is IRollback {
  return 'rollback' in object;
}

function isResolve(object: any): object is IResolve {
  return object != null;
}

function isReject(object: any): object is IReject {
  return object != null;
}

/**
 * Interactor wraps business logic in a promise friendly package.
 */
export class Interactor<T extends object = any> {

  set state(newState: States) {
    this._state = newState;
  }

  get state(): States {
    return this._state;
  }

  /**
   * A static shortcut to creating an instance and calling exec.
   * @param {object} context
   * @returns {Interactor}
   */
  public static exec<T extends object = any>(context: T): Promise<Interactor<T>> {
    const instance = new this(context);
    return instance.exec();
  }

  public context: T;

  public promise: Promise<any> | any;

  protected [resolveSym]: null | IResolve;

  protected [rejectSym]: null | IReject;

  private _state: States = States.NEW;

  private resolveCalled: boolean;

  private rejectCalled: boolean;

  /**
   * context is where our inputs and outputs for this business logic
   * should live.
   * @param {object} context
   */
  constructor(context: T) {
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
  public exec(): Promise<this> {
    this.promise = new Promise((resolve, reject) => {
      this[resolveSym] = resolve;
      this[rejectSym] = reject;
      let root: Promise<any> = Promise.resolve();
      if (isIBefore(this)) {
        this.state = States.BEFORE;
        const beforePromise = this.before();
        if (isPromise(beforePromise)) {
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
  protected resolve(merge: Partial<T> | void): void {
    if (this.rejectCalled) {
      process.emitWarning('Promise Interactor reject already called before resolve');
    }
    if (this.resolveCalled) {
      process.emitWarning('Promise Interactor resolve called multiple times');
    }
    this.resolveCalled = true;
    if (merge) {
      Object.assign(this.context, merge);
    }
    if (isIAfter(this)) {
      this.state = States.AFTER;
      const afterPromise = this.after();
      if (isPromise(afterPromise) === true && afterPromise !== undefined) {
        afterPromise.then(() => {
          this.state = States.RESOLVED;
          this.callResolve();
          return null;
        }).catch(this.reject);
        return;
      }
    }
    this.state = States.RESOLVED;
    this.callResolve();
  }

  /**
   * Access to the promise reject, should be called from call() on failure
   * Also, optionally calls instance method rollback it defined.
   * @param {*} err
   */
  protected reject(err?: Error): void {
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
      if (isPromise(rollbackPromise)) {
        rollbackPromise.then(() => {
          this.callReject(err);
          return null;
        }).catch((newErr: Error) => {
          this.callReject(newErr);
        });
        return; // early exit
      }
    }
    this.state = States.REJECTED;
    this.callReject(err);
  }

  private callResolve() {
    const r = this[resolveSym];
    if (isResolve(r)) {
      r(this);
    } else {
      process.emitWarning('Attempt to call Promise Interactor resolve before it was initialized');
    }
  }

  private callReject(err?: any) {
    const r = this[rejectSym];
    if (isReject(r)) {
      r(err);
    } else {
      process.emitWarning('Attempt to call Promise Interactor reject before it was initialized');
    }
  }
}
