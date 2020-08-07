import { IReject, IResolve } from './promise';
import { States } from './states';
export declare const resolveSym: unique symbol;
export declare const rejectSym: unique symbol;
export declare type interactorConstructor<T extends object> = new (context: T) => Interactor<T>;
export interface IAfter {
    after(): Promise<any> | void;
}
export declare function isIAfter(object: any): object is IAfter;
export interface IBefore {
    before(): Promise<any> | void;
}
export declare function isIBefore(object: any): object is IBefore;
export interface IRollback {
    rollback(error?: Error): Promise<any> | void;
}
export declare function isIRollback(object: any): object is IRollback;
/**
 * Interactor wraps business logic in a promise friendly package.
 */
export declare class Interactor<T extends object = any> {
    state: States;
    /**
     * A static shortcut to creating an instance and calling exec.
     * @param {object} context
     * @returns {Interactor}
     */
    static exec<T extends object = any>(context: T): Promise<Interactor<T>>;
    context: T;
    promise: Promise<any> | any;
    protected [resolveSym]: null | IResolve;
    protected [rejectSym]: null | IReject;
    private _state;
    private resolveCalled;
    private rejectCalled;
    /**
     * context is where our inputs and outputs for this business logic
     * should live.
     * @param {object} context
     */
    constructor(context: T);
    /**
     * Run this interactor
     * @returns {Interactor}
     */
    exec(): Promise<this>;
    /**
     * Abstract method that should be implemented in the child
     */
    call(): void;
    /**
     * Access to the promise resolve, should be called from call() on success
     */
    protected resolve(): void;
    /**
     * Access to the promise reject, should be called from call() on failure
     * Also, optionally calls instance method rollback it defined.
     * @param {*} err
     */
    protected reject(err?: Error): void;
    private callResolve;
    private callReject;
}
