import chai from 'chai';
import spies from 'chai-spies'; // TODO refactor in to test helper

import { Interactor, IAfter, IBefore, IRollback, States as states } from '../src';

chai.use(spies);
const expect = chai.expect;

/* tslint:disable:max-classes-per-file */

interface ITestContext {

}

class TestInteractor extends Interactor<ITestContext> {
  public call() {
    this.resolve();
  }
}

describe('Interactor states', function() {
  let baseContext: ITestContext = {

  };

  it('initially NEW', () => {
    const i = new TestInteractor(baseContext);
    expect(i.state).to.equal(states.NEW);
  });

  it('is BEFORE when calling before', () => {
    let state: states | null = null;
    class TestBeforeInteractor extends TestInteractor implements IBefore {
      public before() {
        state = this.state;
      }
    }
    const i = new TestBeforeInteractor(baseContext);

    return i.exec().then(() => {
      expect(state).to.equal(states.BEFORE);
    });
  });

  it('is CALL when in main call function', () => {
    let state: states | null = null;
    class TestCallInteractor extends TestInteractor {
      public call() {
        state = this.state;
        this.resolve();
      }
    }
    const i = new TestCallInteractor(baseContext);
    return i.exec().then(() => {
      expect(state).to.equal(states.CALL);
    });
  });

  it('is AFTER when calling after', () => {
    let state: states | null = null;
    class TestAfterInteractor extends TestInteractor implements IAfter {
      public after() {
        state = this.state;
      }
    }
    const i = new TestAfterInteractor(baseContext);
    return i.exec().then(() => {
      expect(state).to.equal(states.AFTER);
    });
  });

  it('is RESOLVED when completed', () => {
    const i = new TestInteractor(baseContext);
    return i.exec().then(() => {
      expect(i.state).to.equal(states.RESOLVED);
    });
  });

  it('is ROLLBACK when calling rollback', (done) => {
    let state: states | null = null;
    class TestRollbackInteractor extends TestInteractor implements IRollback {
      public call() {
        this.reject();
      }
      public rollback() {
        state = states.ROLLBACK;
      }
    }
    const i = new TestRollbackInteractor(baseContext);
    i.exec().catch(() => {
      expect(state).to.equal(states.ROLLBACK);
      done();
    });
  });

  it('is REJECTED when not completed', (done) => {
    let state: states | null = null;
    class TestRejectedInteractor extends TestInteractor {
      public call() {
        this.reject();
      }
    }
    const i = new TestRejectedInteractor(baseContext);
    i.exec().then(() => {
      expect(i.state).to.be.empty;
      done();
    }).catch(() => {
      expect(i.state).to.equal(states.REJECTED);
      done();
    });
  });
});