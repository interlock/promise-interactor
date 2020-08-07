import { Interactor, interactorConstructor } from './interactor';

type wrapFn<O, I> = (context: O) => I;
type unwrapFn<I, O> = (context: I, origContext: O) => void;

export function interactorWrapper<O extends object, I extends object>(interactor: interactorConstructor<I>, wrap?: wrapFn<O, I>, unwrap?: unwrapFn<I, O>): interactorConstructor<O> {
  return class extends Interactor<O> {
    async call() {
      if (wrap === undefined) {
        wrap = this.defaultWrap;
      }
      if (unwrap === undefined) {
        unwrap = this.defaultUnwrap;
      }
      const preContext: I = wrap(this.context);
      console.log(`pre: ${JSON.stringify(preContext)}`);
      const inst = new interactor(preContext);
      await inst.exec();
      console.log(`post: ${JSON.stringify(inst.context)}`);
      unwrap(inst.context, this.context);
      this.resolve();
    }

    private defaultWrap: wrapFn<O, I> = (context) => {
      return context as unknown as I;
    }

    private defaultUnwrap: unwrapFn<I, O> = (context, origContext) => {
      Object.assign(origContext, context)
    }
  }
}
