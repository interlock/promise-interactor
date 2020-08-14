import { Interactor, interactorConstructor } from './interactor';

type wrapFn<O, I> = (context: O) => I;
type unwrapFn<I, O> = (context: I, origContext: O) => void;

export function interactorWrapper<O extends object, I extends object>(
  interactor: interactorConstructor<I>,
  wrap?: wrapFn<O, I>,
  unwrap?: unwrapFn<I, O>): interactorConstructor<O> {
  return class extends Interactor<O> {
    public call() {
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

      inst.exec().then(() => {
        try {
          // @ts-ignore
          unwrap(inst.context, this.context);
        } catch (err) {
          return this.reject(err);
        }
        this.resolve();
      }).catch((err) => {
        this.reject(err);
      });
    }

    private defaultWrap: wrapFn<O, I> = (context) => {
      return context as unknown as I;
    }

    private defaultUnwrap: unwrapFn<I, O> = (context, origContext) => {
      Object.assign(origContext, context);
    }
  };
}

/**
 *
 * @param interactor Interactor
 * @param conditionalFn function to inspect the context, returning true if we want to continue with this interactor
 */
export function interactorConditional<I extends object>(
  interactor: interactorConstructor<I>,
  conditionalFn: (ctx: I) => boolean,
): interactorConstructor<I> {
  return class extends Interactor<I> {
    public call() {
      if (conditionalFn(this.context) === false) {
        return this.resolve();
      }
      const inst = new interactor(this.context);
      inst
        .exec()
        .then(() => {
          this.resolve();
        })
        .catch(this.reject);
    }
  };
}

export type resultHandlerFn<I> = (
  err: Error | undefined,
  ctx: I,
  resolve: (merge: Partial<I> | void) => void,
  reject: (err?: Error) => void,
) => void;

/**
 * Allows for adding a layer where the result of the interactor can be examined and re-evaluated
 * @param interactor Interactor
 * @param resultHandler function that will handle the result
 */
export function interactorResultWrapper<I extends object>(
  interactor: interactorConstructor<I>,
  resultHandler: resultHandlerFn<I>,
): interactorConstructor<I> {
  return class extends Interactor<I> {
    public call() {
      const inst = new interactor(this.context);
      inst
        .exec().then(() => {
          resultHandler(undefined, this.context, this.resolve, this.reject);
        })
        .catch((err) => {
          resultHandler(err, this.context, this.resolve, this.reject);
        });
    }
  };
}
