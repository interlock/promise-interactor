import chai from 'chai';
import spies from 'chai-spies'; // TODO refactor in to test helper

import { Interactor } from '../src';

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

describe('Interactor warnings', function() {
  beforeEach(() => {
    chai.spy.on(process, 'emitWarning');
  });

  it('if resolve called more than once', function(done) {
    class TestResolvedTwiceInteractor extends TestInteractor {
      public call() {
        this.resolve();
        this.resolve();
      }
    }
    TestResolvedTwiceInteractor.exec({}).then(() => {
      expect(process.emitWarning).to.have.been.called();
      done();
    });
  });

  it('if reject called more than once', function(done) {
    class TestRejectedTwiceInteractor extends TestInteractor {
      public call() {
        this.reject();
        this.reject();
      }
    }
    TestRejectedTwiceInteractor.exec({}).catch(() => {
      expect(process.emitWarning).to.have.been.called();
      done();
    });
  });

  it('if resolve then reject called', function(done) {
    class TestResolvedThenRejectedInteractor extends TestInteractor {
      public call() {
        this.resolve();
        this.reject();
      }
    }
    TestResolvedThenRejectedInteractor.exec({}).then(() => {
      expect(process.emitWarning).to.have.been.called();
      done();
    });
  });

  it('if reject then resolve called', function(done) {
    class TestRejectedThenResolvedInteractor extends TestInteractor {
      public call() {
        this.reject();
        this.resolve();
      }
    }
    TestRejectedThenResolvedInteractor.exec({}).catch(() => {
      expect(process.emitWarning).to.have.been.called();
      done();
    });
  });

  afterEach(() => {
    chai.spy.restore();
  });
});