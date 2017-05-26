const chai = require('chai');
// TODO refactor in to test helper
const spies = require('chai-spies');

const Promise = require('bluebird');

chai.use(spies);

const Interactor = require('../src/interactor');
const Organizer = require('../src/organizer');

const expect = chai.expect;

class TestInteractor extends Interactor {
  call() {
    this.context.called = true;
    this.context.count += 1;
    if (this.context.rejectMe) {
      this.reject(this.context.error || new Error('You told me to!'));
    } else {
      this.resolve();
    }
  }
}

class TestOrganizer extends Organizer {
  constructor(context) {
    super(context);
    this.interactors = [TestInteractor];
  }
}

describe('Organizer', function() {
  it('single works', function() {
    const org = new TestOrganizer({count: 0});
    return org.exec().then((org) => {
      expect(org.context.count).to.equal(1);
    });
  });

  it('multiple works', function() {
    const org = new TestOrganizer({count: 0});
    org.interactors.push(TestInteractor);
    return org.exec().then((org) => {
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
      chai.spy.on(org, 'before');

      org.exec().catch((err) => {
        expect(err.message).to.equal('Taco not included');
        expect(org.context.beforeCalled).to.be.true;
        expect(org.before).to.have.been.called;
      }).then(done);
    })
  });

  context('rollback', () => {

    it('called with rejection err', () => {
      class TestOrgWithRollback extends TestOrganizer {
        rollback() {
          return Promise.resolve();
        }
      }
      const error = new Error('squirrel!');
      const org = new TestOrgWithRollback({ count: 0, rejectMe: true, error });

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

      return org.exec().catch((err) => {
        expect(err.message).to.equal('alternate reject');
      });
    });
  });
});
