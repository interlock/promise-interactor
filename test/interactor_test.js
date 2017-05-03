const chai = require('chai');
// TODO refactor in to test helper
const spies = require('chai-spies');

chai.use(spies);

const Promise = require('bluebird');
const Interactor = require('../src/interactor');

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

    it('has default state of NEW', function() {
        const i = new TestInteractor();
        expect(i._state).to.eql('NEW');
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
      TestInteractor.exec({ resolveDeep: true }).then((instance) => {
          
          done();
      });
    });

    it('calls rollback if it exists for an error', function(done) {
        TestInteractor.prototype.rollback = function() {
            this.context.rolledback = true;
        };
        const instance = new TestInteractor({ rejectMe: true });
        chai.spy.on(instance, 'rollback');
        instance.exec().catch(() => {
            expect(instance.rollback).to.have.been.called();
            done();
        });
    });

    it('calls rollback with promise return', function(done) {
        TestInteractor.prototype.rollback = function() {
            this.context.rolledback = true;
            return new Promise((resolve) => {
                resolve();
            });
        };
        const instance = new TestInteractor({ rejectMe: true });
        chai.spy.on(instance, 'rollback');
        instance.exec().catch(() => {
            expect(instance.rollback).to.have.been.called();
            done();
        });
    });

    it('calls before if it exists', function(done) {
        TestInteractor.prototype.before = function() {
            this.context.before = true;
            return new Promise((resolve) => {
                resolve();
            });
        };
        const instance = new TestInteractor({ rejectMe: false });
        chai.spy.on(instance, 'before');
        instance.exec().then(() => {
            expect(instance.before).to.have.been.called();
            done();
        });
    });

    it('calls after if it exists', function(done) {
        TestInteractor.prototype.after = function() {
            this.context.after = true;
            return new Promise((resolve) => {
                resolve();
            });
        };
        const instance = new TestInteractor({ rejectMe: false });
        chai.spy.on(instance, 'after');
        instance.exec().then(() => {
            expect(instance.after).to.have.been.called();
            done();
        });
    });
});
