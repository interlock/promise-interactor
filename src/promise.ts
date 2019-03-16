/**
 * Determine the least amount of functionality to be a valid promise
 * @arg {*} The promise in question
 * @return {boolean}
 */
export function isPromise<T>(p: any): p is Promise<T> {
  if (typeof p === 'object' && (typeof p.then  === 'function' || typeof p.catch === 'function')) {
    return true;
  }
  return false;
}

export type IResolve = (value?: {} | PromiseLike<{}> | undefined ) => void;

export type IReject = (reason: any) => void;
