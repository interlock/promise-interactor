import chai from 'chai';
import spies from 'chai-spies'; // TODO refactor in to test helper

import { Interactor, IAfter, IBefore, IRollback, States as states } from '../dist';

chai.use(spies);
const expect = chai.expect;

interface ITestContext {
  called: boolean;
  rejectMe: boolean;
  rollbackState: states | undefined;
  rejectDeep: boolean;
  resolveDeep: boolean;
  resolveTwice: boolean;
  resolveTwiceCallback: (() => void) | null;
  rejectTwice: boolean;
  rejectTwiceCallback: (() => void) | null;
  callback: null | ((value: any) => void);
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
      this.context.callback(this);
    } else {
      this.resolve();
    }
  }

  public before(): Promise<any> {
    return Promise.resolve();
  }

  public after(): Promise<any> {
    return Promise.resolve();
  }

  public rollback(error?: Error): Promise<any> {
    return Promise.resolve();
  }
}

describe('Interactor', function() {
  let baseContext: ITestContext;

  beforeEach(() => {
    baseContext = {
      called: false,
      rejectMe: false,
      rollbackState: undefined,
      rejectDeep: false,
      resolveDeep: false,
      resolveTwice: false,
      resolveTwiceCallback: null,
      rejectTwice: false,
      rejectTwiceCallback: null,
      callback: null,
    };
  });

  it('exec returns a promise', function() {
    const i = new TestInteractor(baseContext);
    const p = i.exec();
    expect(i).to.instanceOf(TestInteractor);
    expect(p).to.instanceOf(Promise);
  });

  it('has promise attribute on instance', function() {
    const i = new TestInteractor(baseContext);
    i.exec();
    expect(i.promise).to.instanceOf(Promise);
  });

  it('wraps the call and still calls it', function(done) {
    const i = new TestInteractor(baseContext);
    i.exec().then((inst) => {
      expect(inst.context.called).to.equal(true);
      done();
    });
  });

  it('returns context and interactor instance', function(done) {
    const i = new TestInteractor(baseContext);
    i.exec().then((inst) => {
      expect(i).to.equal(inst);
      done();
    });
  });

  it('can init from static exec', function(done) {
    TestInteractor.exec(baseContext).then((inst) => {
      expect(inst.context.called).to.equal(true);
      done();
    });
  });

  it('can handle a reject', function(done) {
    baseContext.rejectMe = true;
    TestInteractor.exec(baseContext).catch((err) => {
      expect(err.message).to.eq('You told me to!');
      done();
    });
  });

  it('has reject bound to instance context', function(done) {
    baseContext.rejectDeep = true;
    TestInteractor.exec(baseContext).catch((err) => {
      expect(err.message).to.eq('You told me to!');
      done();
    });
  });

  it('has resolve bound to instance context', function(done) {
    baseContext.resolveDeep = true;
    TestInteractor.exec(baseContext).then(() => {
      done();
    });
  });

  describe('double warnings', () => {
    beforeEach(() => {
      chai.spy.on(process, 'emitWarning');
    });

    it('if resolve called more than once', function(done) {
      baseContext.resolveTwice = true;
      baseContext.resolveTwiceCallback = () => {
        expect(process.emitWarning).to.have.been.called();
        done();
      };
      TestInteractor.exec(baseContext);
    });

    it('if reject called more than once', function(done) {
      const state = {
        ...baseContext,
        rejectTwice: true,
        rejectTwiceCallback: () => {
          expect(process.emitWarning).to.have.been.called();
          done();
        },
      };
      TestInteractor.exec(state);
    });

    it('if resolve then reject called', function(done) {
      const state = {
        ...baseContext,
        callback: (interactor) => {
          interactor.resolve();
          interactor.reject();
          expect(process.emitWarning).to.have.been.called();
          done();
        },
      };
      TestInteractor.exec(state);
    });

    it('if reject then resolve called', function(done) {
      const state = {
        ...baseContext,
        callback: (interactor) => {
          interactor.reject();
          interactor.resolve();
          expect(process.emitWarning).to.have.been.called();
          done();
        },
      };
      TestInteractor.exec(state);
    });

    afterEach(() => {
      chai.spy.restore();
    });
  });

  context('rollback', () => {

    it('gets called if it exists for an error', function(done) {
      baseContext.rejectMe = true;
      const instance = new TestInteractor(baseContext);
      instance.rollback = function(err?: Error): Promise<any> {
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

    it('handles call with promise return', function(done) {
      baseContext.rejectMe = true;
      const instance = new TestInteractor(baseContext);
      instance.rollback = function() {
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
      instance.rollback = function() {
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

    it('uses promise reject as new error', function(done) {
      baseContext.rejectMe = true;
      const instance = new TestInteractor(baseContext);
      instance.rollback = function() {
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
      instance.rollback = function() {
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
        expect(err).to.be.empty();
      });
    });
  });

  it('calls before if it exists', function(done) {
    const instance = new TestInteractor(baseContext);
    instance.before = function() {
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

  it('calls after if it exists', function(done) {
    const instance = new TestInteractor(baseContext);
    instance.after = function() {
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

  describe('state', () => {

    it('initially NEW', () => {
      const i = new TestInteractor(baseContext);
      expect(i.state).to.equal(states.NEW);
    });

    it('is BEFORE when calling before', () => {
      const i = new TestInteractor(baseContext);
      i.before = () => {
        expect(i.state).to.equal(states.BEFORE);
      };
      return i.exec();
    });

    it('is CALL when in main call function', () => {
      const i = new TestInteractor(baseContext);
      i.call = function() {
        expect(i.state).to.equal(states.CALL);
        this.resolve();
      };
      return i.exec();
    });

    it('is AFTER when calling after', () => {
      const i = new TestInteractor(baseContext);
      i.after = () => {
        expect(i.state).to.equal(states.AFTER);
      };
      return i.exec();
    });

    it('is RESOLVED when completed', (done) => {
      const i = new TestInteractor(baseContext);
      i.exec().then(() => {
        expect(i.state).to.equal(states.RESOLVED);
        done();
      });
    });

    it('is ROLLBACK when calling rollback', (done) => {
      baseContext.rejectMe = true;
      const i = new TestInteractor(baseContext);
      i.rollback = function() {
        expect(i.state).to.equal(states.ROLLBACK);
      };
      i.exec().catch(() => {
        done();
      });
    });

    it('is REJECTED when not completed', (done) => {
      baseContext.rejectMe = true;
      const i = new TestInteractor(baseContext);
      i.exec().catch(() => {
        expect(i.state).to.equal(states.REJECTED);
        done();
      });
    });
  });
});
