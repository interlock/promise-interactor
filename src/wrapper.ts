import { Interactor, interactorConstructor } from './interactor';

type wrapFn<O, I> = (context: O) => I;
type unwrapFn<I, O> = (context: I, origContext: O) => void;

export function interactorWrapper<O extends object, I extends object>(
  interactor: interactorConstructor<I>,
  wrap?: wrapFn<O, I>,
  unwrap?: unwrapFn<I, O>): interactorConstructor<O> {
  return class extends Interactor<O> {
    public async call() {
      if (wrap === undefined) {
        wrap = this.defaultWrap;
      }
      if (unwrap === undefined) {
        unwrap = this.defaultUnwrap;
      }
      let preContext: I;
      try {
         preContext = wrap(this.context);
      } catch (err) {
        return this.reject(err);
      }
      const inst = new interactor(preContext);
      await inst.exec();
      try {
        unwrap(inst.context, this.context);
      } catch (err) {
        return this.reject(err);
      }
      this.resolve();
    }

    private defaultWrap: wrapFn<O, I> = (context) => {
      return context as unknown as I;
    }

    private defaultUnwrap: unwrapFn<I, O> = (context, origContext) => {
      Object.assign(origContext, context);
    }
  };
}
