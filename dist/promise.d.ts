/**
 * Determine the least amount of functionality to be a valid promise
 * @arg {*} The promise in question
 * @return {boolean}
 */
export declare function isPromise<T>(p: any): p is Promise<T>;
export declare type IResolve = (value?: {} | PromiseLike<{}> | undefined) => void;
export declare type IReject = (reason: any) => void;
