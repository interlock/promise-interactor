import chai from 'chai';
import spies from 'chai-spies'; // TODO refactor in to test helper
import { IAfter, IBefore, Interactor, IRollback, States as states, interactorWrapper } from '../src';
import { O_TRUNC } from 'constants';

chai.use(spies);
const expect = chai.expect;

type ITestContext = {
  catTreat: string;
  catHappy?: boolean;
}

type IOrgContext = {
  catName?: string;
} & Partial<ITestContext>;

class TestInteractor extends Interactor<ITestContext> {
  call() {
    if (this.context.catTreat === 'fish') {
      this.context.catHappy = true;
    }
    this.resolve();
  }
}
describe('wrapper', () => {

  it('wrap functions', async () => {
    const orgCtx: IOrgContext = {
      catName: 'Nimh',
      catTreat: 'fish'
    };

    const c = interactorWrapper<IOrgContext, ITestContext>(TestInteractor, (context) => {
      return { catTreat: context.catTreat || '' }
    }, (context, origContext) => {
      origContext.catHappy = context.catHappy;
    });
    const inst = new c(orgCtx);
    await inst.exec();
    expect(inst.context.catHappy).to.be.true;
  });

  it('default unwrap does assign', async () => {
    const orgCtx: IOrgContext = {
      catName: 'Nimh',
      catTreat: 'fish'
    };

    const c = interactorWrapper<IOrgContext, ITestContext>(TestInteractor, (context) => {
      return { catTreat: context.catTreat || '' }
    });
    const inst = new c(orgCtx);
    await inst.exec();
    expect(inst.context.catHappy).to.be.true;
  });

  it('default wrap',  async () => {
    const orgCtx: IOrgContext = {
      catName: 'Nimh',
      catTreat: 'fish'
    };

    const c = interactorWrapper<IOrgContext, ITestContext>(TestInteractor);
    const inst = new c(orgCtx);
    await inst.exec();
    expect(inst.context.catHappy).to.be.true;
  }
});
