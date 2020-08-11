import chai from 'chai';
import spies from 'chai-spies'; // TODO refactor in to test helper

import { IAfter, IBefore, Interactor, IRollback, States as states } from '../src';
import { any } from 'bluebird';

chai.use(spies);
const expect = chai.expect;

/* tslint:disable:max-classes-per-file */

interface ITestContext {
  before: boolean;
  after: boolean;
  called: boolean;
  rejectMe: boolean;
  rolledback: boolean;
  rollbackState: states | undefined;
  rejectDeep: boolean;
  resolveDeep: boolean;
  resolveTwice: boolean;
  resolveTwiceCallback: (() => void) | null;
  rejectTwice: boolean;
  rejectTwiceCallback: (() => void) | null;
  callback: null | ((value: TestInteractor) => Promise<any>);
  throwException: boolean;
  resolveWithValue?: Partial<this>;
  extra: any;
}

class TestInteractor extends Interactor<ITestContext> implements IRollback, IAfter, IBefore {
  public call() {
    this.context.called = true;
    if (this.context.rejectMe) {
      this.reject(new Error('You told me to!'));
    } else if (this.context.rejectDeep) {
      Promise.reject(new Error('You told me to!')).catch(this.reject);
    } else if (this.context.resolveDeep) {
      Promise.resolve().then(this.resolve);
    } else if (this.context.resolveTwice) {
      Promise.resolve().then(() => {
        this.resolve();
      }).then(() => {
        this.resolve();
        if (this.context.resolveTwiceCallback) {
          this.context.resolveTwiceCallback();
        }
      });
    } else if (this.context.resolveWithValue) {
      this.resolve(this.context.resolveWithValue);
    } else if (this.context.rejectTwice) {
      Promise.resolve().then(() => {
        this.reject();
      }).then(() => {
        this.reject();
        if (this.context.rejectTwiceCallback) {
          this.context.rejectTwiceCallback();
        }
      });
    } else if (this.context.callback) {
      this.context.callback(this).then(this.resolve).catch(this.reject);
    } else if (this.context.throwException) {
      throw new Error('I threw an exception');
    } else {
      this.resolve();
    }
  }

  public before(): Promise<any> | void {
    return Promise.resolve();
  }

  public after(): Promise<any> | void {
    return Promise.resolve();
  }

  public rollback(error?: Error): Promise<any> | void {
    return Promise.resolve();
  }
}

describe('Interactor', function () {
  let baseContext: ITestContext;

  beforeEach(() => {
    baseContext = {
      before: false,
      after: false,
      called: false,
      rejectMe: false,
      rolledback: false,
      rollbackState: undefined,
      rejectDeep: false,
      resolveDeep: false,
      resolveTwice: false,
      resolveTwiceCallback: null,
      rejectTwice: false,
      rejectTwiceCallback: null,
      callback: null,
      throwException: false,
      resolveWithValue: undefined,
      extra: any
    };
  });

  it('exec returns a promise', function () {
    const i = new TestInteractor(baseContext);
    const p = i.exec();
    expect(i).to.instanceOf(TestInteractor);
    expect(p).to.instanceOf(Promise);
  });

  it('has promise attribute on instance', function () {
    const i = new TestInteractor(baseContext);
    i.exec();
    expect(i.promise).to.instanceOf(Promise);
  });

  it('wraps the call and still calls it', function (done) {
    const i = new TestInteractor(baseContext);
    i.exec().then((inst) => {
      expect(inst.context.called).to.equal(true);
      done();
    });
  });

  it('returns context and interactor instance', function (done) {
    const i = new TestInteractor(baseContext);
    i.exec().then((inst) => {
      expect(i).to.equal(inst);
      done();
    });
  });

  it('resolve with partial merges to context', function (done) {
    baseContext.resolveWithValue = { extra: true };
    const i = new TestInteractor(baseContext);
    i.exec().then((inst) => {
      expect(inst.context.extra).to.be.true;
      done();
    });
  });

  it('can init from static exec', function (done) {
    TestInteractor.exec(baseContext).then((inst) => {
      expect(inst.context.called).to.equal(true);
      done();
    });
  });

  it('can handle a reject', function (done) {
    baseContext.rejectMe = true;
    TestInteractor.exec(baseContext).catch((err) => {
      expect(err.message).to.eq('You told me to!');
      done();
    });
  });

  it('can handle exception thrown', function (done) {
    baseContext.throwException = true;
    TestInteractor.exec(baseContext).catch((err) => {
      expect(err.message).to.eq('I threw an exception');
      done();
    });
  });
  it('has reject bound to instance context', function (done) {
    baseContext.rejectDeep = true;
    TestInteractor.exec(baseContext).catch((err) => {
      expect(err.message).to.eq('You told me to!');
      done();
    });
  });

  it('has resolve bound to instance context', function (done) {
    baseContext.resolveDeep = true;
    TestInteractor.exec(baseContext).then(() => {
      done();
    });
  });

  context('rollback', () => {

    it('gets called if it exists for an error', function (done) {
      baseContext.rejectMe = true;
      const instance = new TestInteractor(baseContext);
      instance.rollback = function (err?: Error): Promise<any> {
        this.context.rolledback = true;
        return Promise.resolve();
      };
      chai.spy.on(instance, 'rollback');
      instance.exec().then(() => {
        expect(instance.state).to.equal('REJECTED');
        done();
      }).catch(() => {
        expect(instance.rollback).to.have.been.called();
        done();
      });
    });

    it('handles call with promise return', function (done) {
      baseContext.rejectMe = true;
      const instance = new TestInteractor(baseContext);
      instance.rollback = function () {
        this.context.rolledback = true;
        return new Promise((resolve) => {
          resolve();
        });
      };
      chai.spy.on(instance, 'rollback');
      instance.exec().catch(() => {
        expect(instance.rollback).to.have.been.called();
        done();
      });
    });

    it('passed original error down if no rejects occure', (done) => {
      baseContext.rejectMe = true;
      const instance = new TestInteractor(baseContext);
      instance.rollback = function () {
        this.context.rolledback = true;
        return new Promise((resolve) => {
          resolve();
        });
      };
      chai.spy.on(instance, 'rollback');
      instance.exec().catch((err) => {
        expect(err.message).to.eq('You told me to!');
        done();
      });
    });

    it('uses promise reject as new error', function (done) {
      baseContext.rejectMe = true;
      const instance = new TestInteractor(baseContext);
      instance.rollback = function () {
        this.context.rolledback = true;
        return new Promise((resolve, reject) => {
          reject(new Error('cat in the hat'));
        });
      };
      chai.spy.on(instance, 'rollback');
      instance.exec().catch((err) => {
        expect(err.message).to.eq('cat in the hat');
        done();
      });
    });

    it('can reject when the state is RESOLVED', (done) => {
      baseContext.rejectMe = true;
      const instance = new TestInteractor(baseContext);
      instance.rollback = function () {
        this.context.rolledback = true;
        return new Promise((resolve) => {
          this.context.rollbackState = this.state;
          resolve();
        });
      };

      instance.exec().then((instance) => {
        expect(instance.state).to.equal(states.RESOLVED);
        return instance.rollback();
      }).then(() => {
        expect(instance.context.rollbackState).to.equal(states.RESOLVED);
        done();
      }).catch((err) => {
        expect(err).to.be.empty;
        done();
      });
    });
  });

  it('calls before if it exists', function (done) {
    const instance = new TestInteractor(baseContext);
    instance.before = function () {
      this.context.before = true;
      return new Promise((resolve) => {
        resolve();
      });
    };
    chai.spy.on(instance, 'before');
    instance.exec().then(() => {
      expect(instance.before).to.have.been.called();
      done();
    });
  });

  it('calls after if it exists', function (done) {
    const instance = new TestInteractor(baseContext);
    instance.after = function () {
      this.context.after = true;
      return new Promise((resolve) => {
        resolve();
      });
    };
    chai.spy.on(instance, 'after');
    instance.exec().then(() => {
      expect(instance.after).to.have.been.called();
      done();
    });
  });
});
