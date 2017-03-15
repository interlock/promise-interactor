const chai = require('chai');
// TODO refactor in to test helper
const spies = require('chai-spies');

chai.use(spies);

const Promise = require('bluebird');
const Interactor = require('../../lib/interactor/interactor');

const expect = chai.expect;

class TestInteractor extends Interactor {
  call() {
    this.context.called = true;
    if (this.context.rejectMe) {
      this.reject(new Error('You told me to!'));
    } else {
      this.resolve();
    }
  }
}

describe('Interactor', function() {

  it('call returns an instance', function() {
    const i = new TestInteractor();
    const p = i.exec();
    expect(p).to.instanceOf(TestInteractor);
    expect(p).to.instanceOf(Interactor);
  });

  it('has promise attribute on instance', function() {
    const i = new TestInteractor();
    const p = i.exec();
    expect(p.promise).to.instanceOf(Promise);
  });

  it('wraps the call and still calls it', function(done) {
    const i = new TestInteractor();
    i.exec().promise.then((context) => {
      expect(context.called).to.equal(true);
      done();
    });
  });

  it('can init from static exec', function(done) {
    TestInteractor.exec().promise.then((context) => {
      expect(context.called).to.equal(true);
      done();
    });
  });

  it('can handle a reject', function(done) {
    TestInteractor.exec({ rejectMe: true }).promise.catch((err) => {
      expect(err.message).to.eq('You told me to!');
      done();
    });
  });

  it('calls rollback if it exists for an error', function(done) {
    TestInteractor.prototype.rollback = function() {
      this.context.rolledback = true;
    };
    const instance = new TestInteractor({ rejectMe: true });
    chai.spy.on(instance, 'rollback');
    instance.exec().promise.catch(() => {
      expect(instance.rollback).to.have.been.called();
      done();
    });
  });

  it('calls rollback with promise return', function(done) {
    TestInteractor.prototype.rollback = function() {
      this.context.rolledback = true;
      return new Promise((resolve, reject) => {
        resolve();
      });
    };
    const instance = new TestInteractor({ rejectMe: true });
    chai.spy.on(instance, 'rollback');
    instance.exec().promise.catch(() => {
      expect(instance.rollback).to.have.been.called();
      done();
    });
  });
});
