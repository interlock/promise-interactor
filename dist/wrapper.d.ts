import { interactorConstructor } from './interactor';
declare type wrapFn<O, I> = (context: O) => I;
declare type unwrapFn<I, O> = (context: I, origContext: O) => void;
export declare function interactorWrapper<O extends object, I extends object>(interactor: interactorConstructor<I>, wrap: wrapFn<O, I>, unwrap?: unwrapFn<I, O>): interactorConstructor<O>;
export {};
