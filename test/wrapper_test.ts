import chaifrom 'chai';
import spies from 'chai-spies'; // TODO refactor in to test helper
import { Interactor, interactorWrapper, interactorConditional, Organizer, interactorResultWrapper } from '../src';

chai.use(spies);
const expect = chai.expect;

type ITestContext = {
  catTreat: string;
  catHappy?: boolean;
}

type ITest2Context = {
  pew: number;
}

type IOrgContext = {
  catName?: string;
} & ITest2Context & Partial<ITestContext>;

class TestInteractor extends Interactor<ITestContext> {
  call() {
    if (this.context.catTreat === 'fish') {
      this.context.catHappy = true;
    } else if (this.context.catTreat === 'kibble') {
      this.context.catHappy = false;
      throw new Error('Unacceptable Cat treat!');
    }
    this.resolve();
  }
}

class TestInteractor2 extends Interactor<ITest2Context> {
  call() {
    this.context.pew *= 2;
    this.resolve();
  }
}

class TestOrganizer extends Organizer<IOrgContext> {
  organize() {
    return [interactorWrapper<IOrgContext, ITestContext>(TestInteractor), TestInteractor2]
  }
}

describe('wrappers', () => {
  describe('interactorWrapper', () => {
    it('wrap functions', async () => {
      const orgCtx: IOrgContext = {
        catName: 'Nimh',
        catTreat: 'fish',
        pew: 2
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
        catTreat: 'fish',
        pew: 2
      };

      const c = interactorWrapper<IOrgContext, ITestContext>(TestInteractor, (context) => {
        return { catTreat: context.catTreat || '' }
      });
      const inst = new c(orgCtx);
      await inst.exec();
      expect(inst.context.catHappy).to.be.true;
    });

    it('default wrap', async () => {
      const orgCtx: IOrgContext = {
        catName: 'Nimh',
        catTreat: 'fish',
        pew: 2,
      };

      const c = interactorWrapper<IOrgContext, ITestContext>(TestInteractor);
      const inst = new c(orgCtx);
      await inst.exec();
      expect(inst.context.catHappy).to.be.true;
    });

    it('catches exception in wrap', async () => {
      const orgCtx: IOrgContext = {
        catName: 'Nimh',
        catTreat: 'fish',
        pew: 2
      };

      const c = interactorWrapper<IOrgContext, ITestContext>(TestInteractor, (context) => {
        throw new Error('kitten overload');
      }, (context, origContext) => {
        origContext.catHappy = context.catHappy;
      });
      const inst = new c(orgCtx)
      try {
        await inst.exec();
      } catch (err) {
        expect(err.message).to.be.equal('kitten overload');
      }
    });

    it('catches exception in unwrap', async () => {
      const orgCtx: IOrgContext = {
        catName: 'Nimh',
        catTreat: 'fish',
        pew: 2
      };

      const c = interactorWrapper<IOrgContext, ITestContext>(TestInteractor, (context) => {
        return { catTreat: context.catTreat || '' }
      }, (context, origContext) => {
        throw new Error('Cat refuses to unbox');
      });
      const inst = new c(orgCtx)
      try {
        await inst.exec();
      } catch (err) {
        expect(err.message).to.be.equal('Cat refuses to unbox');
      }
    });

    it('rejects if wrapped interactor throws', (done) => {
      const orgCtx: IOrgContext = {
        catName: 'Nimh',
        catTreat: 'kibble',
        pew: 2,
      };

      const c = interactorWrapper<IOrgContext, ITestContext>(TestInteractor);
      const inst = new c(orgCtx);
      inst.exec().catch((err) => {
        expect(err.message).to.be.eq('Unacceptable Cat treat!');
        done();
      })
    });
    it('can be included with other interactors', async () => {
      const orgCtx: IOrgContext = {
        catName: 'Nimh',
        catTreat: 'fish',
        pew: 2,
      };
      const org = await TestOrganizer.exec(orgCtx);
      expect(org.context.catHappy).to.be.true;
      expect(org.context.pew).to.be.eq(4);
    })
  })

  describe('interactorConditional', () => {
    it('calls interactor if true', async () => {
      const interactor = interactorConditional(TestInteractor2, (ctx) => ctx.pew === 2);
      const inst = await (new interactor({ pew: 2 }).exec());
      expect(inst.context.pew).to.eq(4);
    });

    it('does not call interactor if false', async () => {
      const interactor = interactorConditional(TestInteractor2, (ctx) => ctx.pew === 2);
      const inst = await (new interactor({ pew: 1 }).exec());
      expect(inst.context.pew).to.eq(1);
    });
  });

  describe('interactorResultWrapper', () => {
    it('calls handlerFunction on resolve', async () => {
      let called = false;
      const interactor = interactorResultWrapper(TestInteractor2, (err, ctx, resolve, reject) => {
        called = true;
        resolve();
      });
      const inst = await (new interactor({ pew: 2 }).exec());
      expect(called).to.be.true;
    });

    it('can make a reject a resolve', async () => {
      const interactor = interactorResultWrapper(TestInteractor, (err, ctx, resolve, reject) => {
        resolve();
      });
      const inst = await (new interactor({ catTreat: 'kibble' }).exec());
      expect(inst.context.catHappy).to.be.false;
    });

    it('can make a resovle a reject', async () => {
      const interactor = interactorResultWrapper(TestInteractor2, (err, ctx, resolve, reject) => {
        reject(new Error('Nope'));
      });
      try {
        const inst = await (new interactor({ pew: 2 }).exec());
        expect(inst.context.pew).to.eq(2);
      } catch (err) {
        expect(err.message).to.eq('Nope');
      }
    })
  })
});
