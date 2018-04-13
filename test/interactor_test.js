const chai = require('chai');
// TODO refactor in to test helper
const spies = require('chai-spies');

chai.use(spies);

const Interactor = require('../src/interactor');
const states = require('../src/states');

const expect = chai.expect;

class TestInteractor extends Interactor {
  call() {
    this.context.called = true;
    if (this.context.rejectMe) {
      this.reject(new Error('You told me to!'));
    } else if (this.context.rejectDeep) {
      Promise.reject(new Error('You told me to!')).catch(this.reject);
    } else if (this.context.resolveDeep) {
      Promise.resolve().then(this.resolve);
    } else {
      this.resolve();
    }
  }
}

describe('Interactor', function() {

  it('exec returns a promise', function() {
    const i = new TestInteractor();
    const p = i.exec();
    expect(i).to.instanceOf(TestInteractor);
    expect(p).to.instanceOf(Promise);
  });

  it('has promise attribute on instance', function() {
    const i = new TestInteractor();
    i.exec();
    expect(i.promise).to.instanceOf(Promise);
  });

  it('wraps the call and still calls it', function(done) {
    const i = new TestInteractor();
    i.exec().then((inst) => {
      expect(inst.context.called).to.equal(true);
      done();
    });
  });

  it('returns context and interactor instance', function(done) {
    const i = new TestInteractor();
    i.exec().then((inst) => {
      expect(i).to.equal(inst);
      done();
    });
  });

  it('can init from static exec', function(done) {
    TestInteractor.exec().then((inst) => {
      expect(inst.context.called).to.equal(true);
      done();
    });
  });

  it('can handle a reject', function(done) {
    TestInteractor.exec({ rejectMe: true }).catch((err) => {
      expect(err.message).to.eq('You told me to!');
      done();
    });
  });

  it('has reject bound to instance context', function(done) {
    TestInteractor.exec({ rejectDeep: true }).catch((err) => {
      expect(err.message).to.eq('You told me to!');
      done();
    });
  });

  it('has resolve bound to instance context', function(done) {
    TestInteractor.exec({ resolveDeep: true }).then(() => {
      done();
    });
  });

  context('rollback', () => {

    it('gets called if it exists for an error', function(done) {
      const instance = new TestInteractor({ rejectMe: true });
      instance.rollback = function() {
        this.context.rolledback = true;
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
      const instance = new TestInteractor({ rejectMe: true });
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
      const instance = new TestInteractor({ rejectMe: true });
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
      const instance = new TestInteractor({ rejectMe: true });
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
      const instance = new TestInteractor({ rejectMe: false });
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
    const instance = new TestInteractor({ rejectMe: false });
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
    const instance = new TestInteractor({ rejectMe: false });
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
      const i = new TestInteractor();
      expect(i.state).to.equal(states.NEW);
    });

    it('is BEFORE when calling before', () => {
      const i = new TestInteractor();
      i.before = () => {
        expect(i.state).to.equal(states.BEFORE);
      };
      return i.exec();
    });

    it('is CALL when in main call function', () => {
      const i = new TestInteractor();
      i.call = function() {
        expect(i.state).to.equal(states.CALL);
        this.resolve();
      };
      return i.exec();
    });

    it('is AFTER when calling after', () => {
      const i = new TestInteractor();
      i.after = () => {
        expect(i.state).to.equal(states.AFTER);
      };
      return i.exec();
    });

    it('is RESOLVED when completed', (done) => {
      const i = new TestInteractor();
      i.exec().then(() => {
        expect(i.state).to.equal(states.RESOLVED);
        done();
      });
    });

    it('is ROLLBACK when calling rollback', (done) => {
      const i = new TestInteractor({rejectMe: true});
      i.rollback = function() {
        expect(i.state).to.equal(states.ROLLBACK);
      };
      i.exec().catch(() => {
        done();
      });
    });

    it('is REJECTED when not completed', (done) => {
      const i = new TestInteractor({rejectMe: true});
      i.exec().catch(() => {
        expect(i.state).to.equal(states.REJECTED);
        done();
      });
    });
  });
});
