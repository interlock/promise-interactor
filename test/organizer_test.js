const chai = require('chai');
// TODO refactor in to test helper
const spies = require('chai-spies');

chai.use(spies);

const Interactor = require('../dist/').Interactor;
const Organizer = require('../dist').Organizer;

const expect = chai.expect;

class TestInteractor extends Interactor {
  call() {
    this.context.called = true;
    this.context.count += 1;
    const rejectOnCount = this.context.rejectOnCount || 1;
    if (this.context.rejectMe && rejectOnCount === this.context.count) {
      this.reject(this.context.error || new Error('You told me to!'));
    } else if (this.context.rejectOn && this.context.rejectOn == this.context.count) {
      this.reject(this.context.error || new Error(`Reject on error count: ${this.context.count}`));
    } else {
      this.resolve();
    }
  }
}

class TestOrganizer extends Organizer {
  constructor(context) {
    super(context);
  }
}

describe('Organizer', function() {

  describe('organize', function() {
    it('calls organize to get interactors', () => {
      const org = new TestOrganizer({count: 0});
      org.organize = () => [TestInteractor];
      chai.spy.on(org, 'organize');


      return org.exec().then(() => {
        expect(org.organize).to.have.been.called();
      });
    });

    it('defaults to throwing an exception if not implemented', () => {
      const org = new TestOrganizer({count: 0});
      delete org.organize;
      expect(org.organize).to.throw();
    });

    it('rejects if organize throws exception', () => {
      const org = new TestOrganizer({count: 0});

      return org.exec().catch((err) => {
        expect(err.message).to.equal('organize must be implemented');
        return null;
      });
    });
  });

  it('single works', function() {
    const org = new TestOrganizer({count: 0});
    org.organize = () => [TestInteractor];
    return org.exec().then((org) => {
      expect(org.context.count).to.equal(1);
    });
  });

  it('multiple works', function() {
    const org = new TestOrganizer({count: 0});
    org.organize = () => [TestInteractor, TestInteractor];
    return org.exec().then((org) => {
      expect(org.context.count).to.equal(2);
    });
  });

  it('multiple does not chain calls on reject', function() {
    const org = new TestOrganizer({count: 0, rejectOn: 2});
    org.organize = () => [TestInteractor, TestInteractor, TestInteractor];
    return org.exec().catch((error) => {
      expect(error.message).to.equal('Reject on error count: 2');
      expect(org.context.count).to.equal(2);
    });
  });

  context('before', () => {
    it('called if defined', (done) => {
      class TestOrgWithBefore extends TestOrganizer {
        before() {
          this.context.beforeCalled = true;
          return Promise.resolve();
        }
      }
      const org = new TestOrgWithBefore();
      org.organize = () => [TestInteractor];
      chai.spy.on(org, 'before');

      org.exec().then(() => {
        expect(org.context.beforeCalled).to.be.true;
        expect(org.before).to.have.been.called;
        done();
      });
    });

    it('rejects immediately if the before returns a rejected promise', (done) => {
      class TestOrgWithBefore extends TestOrganizer {
        before() {
          this.context.beforeCalled = true;
          return Promise.reject(new Error('Taco not included'));
        }
      }
      const org = new TestOrgWithBefore();
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
      class TestOrgWithRollback extends TestOrganizer {
        rollback() {
          this.context.rolledBack = true;
          return Promise.resolve();
        }
      }
      const error = new Error('squirrel!');
      const org = new TestOrgWithRollback({ count: 0, rejectMe: true, error });
      org.organize = () => [TestInteractor];
      chai.spy.on(org, 'rollback');
      return org.exec().catch((err) => {
        expect(org.rollback).to.have.been.called.with(error);
        expect(err).to.equal(error);
      });
    });

    it('called if one fails', () => {
      class TestOrgWithRollback extends TestOrganizer {
        rollback() {
          return Promise.resolve();
        }
      }
      const org = new TestOrgWithRollback({ count: 0, rejectMe: true });
      org.organize = () => [TestInteractor];
      chai.spy.on(org, 'rollback');
      return org.exec().catch(() => {
        expect(org.rollback).to.have.been.called();
      });
    });

    it('replaced err of reject with new one', () => {
      class TestOrgWithRollback extends TestOrganizer {
        rollback() {
          return new Promise((resolve, reject) => {
            reject(new Error('alternate reject'));
          });
        }
      }
      const org = new TestOrgWithRollback({ count: 0, rejectMe: true });
      org.organize = () => [TestInteractor];
      return org.exec().catch((err) => {
        expect(err.message).to.equal('alternate reject');
      });
    });

    it('calls rollback on prior called interactors', () => {
      class TestOrgWithRollback extends TestOrganizer {
      }
      class TestRolllBackInteractor extends TestInteractor {
        rollback() {
          this.context.rolledBack += 1;
          this.context.rejectLabels.push(`reject-count-${this.context.rolledBack}`);
          return Promise.resolve();
        }
      }
      const error = new Error('squirrel!');
      const org = new TestOrgWithRollback({ rolledBack: 0, count: 0, rejectLabels: [], rejectOnCount: 2, rejectMe: true, error });

      org.organize = () => [TestRolllBackInteractor, TestRolllBackInteractor];
      return org.exec().catch(() => {
        expect(org.context.rejectLabels).to.contain('reject-count-1');
        expect(org.context.rejectLabels).to.contain('reject-count-2');
        expect(org.context.rolledBack).to.equal(2);
      });
    });
  });
});
