import chai from 'chai';
import spies from 'chai-spies';

chai.use(spies);

import { IBefore, Interactor, IRollback, Organizer } from '../src';
import { Test } from 'mocha';

const expect = chai.expect;

/* tslint:disable:max-classes-per-file */

interface ITest {
  called: boolean;
  count: number;
  rejectOnCount: number;
  rejectMe: boolean;
  error?: Error;
  rejectOn: number;
  beforeCalled: boolean;
  rolledBack: boolean;
  rolledBackCount: number;
  rejectLabels: string[];
}

class TestInteractor extends Interactor<ITest> {
  public call() {
    this.context.called = true;
    this.context.count += 1;
    const rejectOnCount = this.context.rejectOnCount || 1;
    if (this.context.rejectMe && rejectOnCount === this.context.count) {
      this.reject(this.context.error || new Error('You told me to!'));
    } else if (this.context.rejectOn && this.context.rejectOn === this.context.count) {
      this.reject(this.context.error || new Error(`Reject on error count: ${this.context.count}`));
    } else {
      this.resolve();
    }
  }
}

class TestOrganizer extends Organizer<ITest> {
  private orgs: Array<new(context: ITest) => Interactor<ITest>> = [];
  public push(org: new(context: ITest) => Interactor<ITest>) {
    this.orgs.push(org);
  }

  public organize(): Array<new(context: ITest) => Interactor<ITest>> {
    return this.orgs;
  }
}

describe('Organizer', function() {
  let baseContext: ITest = {
    called: false,
    count: 0,
    rejectOnCount: -1,
    rejectMe: false,
    rejectOn: -1,
    beforeCalled: false,
    rolledBack: false,
    rolledBackCount: 0,
    rejectLabels: [],
  };
  beforeEach(() => {
    baseContext = {
      called: false,
      count: 0,
      rejectOnCount: -1,
      rejectMe: false,
      rejectOn: -1,
      beforeCalled: false,
      rolledBack: false,
      rolledBackCount: 0,
      rejectLabels: [],
    };
  });

  describe('organize', function() {
    it('calls organize to get interactors', () => {
      const org = new TestOrganizer(baseContext);
      org.organize = () => [TestInteractor];
      chai.spy.on(org, 'organize');

      return org.exec().then(() => {
        expect(org.organize).to.have.been.called();
      });
    });

    it('defaults to throwing an exception if not implemented', () => {
      const org = new TestOrganizer(baseContext);
      delete org.organize;
      expect(org.organize).to.throw();
    });

    it('rejects if organize throws exception', () => {
      const org = new TestOrganizer(baseContext);

      return org.exec().catch((err: any) => {
        expect(err.message).to.equal('organize must be implemented');
        return null;
      });
    });
  });

  it('single works', function() {
    const org = new TestOrganizer(baseContext);
    org.organize = () => [TestInteractor];
    return org.exec().then((org) => {
      expect(org.context.count).to.equal(1);
    });
  });

  it('multiple works', function() {
    const org = new TestOrganizer(baseContext);
    org.organize = () => [TestInteractor, TestInteractor];
    return org.exec().then((org) => {
      expect(org.context.count).to.equal(2);
    });
  });

  it('multiple does not chain calls on reject', function() {
    baseContext.rejectOn = 2;
    const org = new TestOrganizer(baseContext);
    org.organize = () => [TestInteractor, TestInteractor, TestInteractor];
    return org.exec().catch((error: any) => {
      expect(error.message).to.equal('Reject on error count: 2');
      expect(org.context.count).to.equal(2);
    });
  });

  context('before', () => {
    it('called if defined', (done) => {
      class TestOrgWithBefore extends TestOrganizer implements IBefore {
        public before(): Promise<any> {
          this.context.beforeCalled = true;
          return Promise.resolve();
        }
      }
      const org = new TestOrgWithBefore(baseContext);
      org.organize = () => [TestInteractor];
      chai.spy.on(org, 'before');

      org.exec().then(() => {
        expect(org.context.beforeCalled).to.be.true;
        expect(org.before).to.have.been.called;
        done();
      });
    });

    it('rejects immediately if the before returns a rejected promise', (done) => {
      class TestOrgWithBefore extends TestOrganizer implements IBefore {
        public before(): Promise<any> {
          this.context.beforeCalled = true;
          return Promise.reject(new Error('Taco not included'));
        }
      }
      const org = new TestOrgWithBefore(baseContext);
      org.organize = () => [TestInteractor];
      chai.spy.on(org, 'before');

      org.exec().catch((err) => {
        expect(err.message).to.equal('Taco not included');
        expect(org.context.beforeCalled).to.be.true;
        expect(org.before).to.have.been.called;
      }).then(done);
    });
  });

  context('rollback', () => {

    it('called with rejection err', () => {
      class TestOrgWithRollback extends TestOrganizer implements IRollback {
        public rollback(): Promise<any> {
          this.context.rolledBack = true;
          return Promise.resolve();
        }
      }
      const error = new Error('squirrel!');
      baseContext.rejectMe = true;
      baseContext.error = error;
      const org = new TestOrgWithRollback(baseContext);
      org.push(TestInteractor);
      chai.spy.on(org, 'rollback');
      return org.exec().catch((err) => {
        expect(org.rollback).to.have.been.called.with(error);
        expect(err).to.equal(error);
      });
    });

    it('called if one fails', () => {
      class TestOrgWithRollback extends TestOrganizer implements IRollback {
        public rollback() {
          return Promise.resolve();
        }
      }
      baseContext.rejectMe = true;
      const org = new TestOrgWithRollback(baseContext);
      org.push(TestInteractor);
      chai.spy.on(org, 'rollback');
      return org.exec().catch(() => {
        expect(org.rollback).to.have.been.called();
      });
    });

    it('replaced err of reject with new one', () => {
      class TestOrgWithRollback extends TestOrganizer implements IRollback {
        public rollback(): Promise<any> {
          return new Promise((resolve, reject) => {
            reject(new Error('alternate reject'));
          });
        }
      }
      baseContext.rejectMe = true;
      const org = new TestOrgWithRollback(baseContext);
      org.push(TestInteractor);
      return org.exec().catch((err) => {
        expect(err.message).to.equal('alternate reject');
      });
    });

    it('calls rollback on prior called interactors', () => {
      class TestOrgWithRollback extends TestOrganizer {
      }
      class TestRolllBackInteractor extends TestInteractor implements IRollback {
        public rollback(): Promise<any> {
          this.context.rolledBackCount += 1;
          this.context.rejectLabels.push(`reject-count-${this.context.rolledBackCount}`);
          return Promise.resolve();
        }
      }
      const error = new Error('squirrel!');
      baseContext.rejectOnCount = 2;
      baseContext.rejectMe = true;
      baseContext.error = error;
      const org = new TestOrgWithRollback(baseContext);
      org.push(TestRolllBackInteractor);
      org.push(TestRolllBackInteractor);
      return org.exec().catch(() => {
        expect(org.context.rejectLabels).to.contain('reject-count-1');
        expect(org.context.rejectLabels).to.contain('reject-count-2');
        expect(org.context.rolledBackCount).to.equal(2);
      });
    });
  });
});
