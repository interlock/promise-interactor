const chai = require('chai');
// TODO refactor in to test helper
const spies = require('chai-spies');

chai.use(spies);

const Interactor = require('../src/interactor');
const Organizer = require('../src/organizer');

const expect = chai.expect;

class TestInteractor extends Interactor {
  call() {
    this.context.called = true;
    this.context.count += 1;
    if (this.context.rejectMe) {
      this.reject(new Error('You told me to!'));
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
});
