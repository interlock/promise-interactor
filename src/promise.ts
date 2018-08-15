/**
 * Determine the least amount of functionality to be a valid promise
 * @arg {*} The promise in question
 * @return {boolean}
 */
export function isPromise(p: any): p is Promise<any> {
  if (typeof p === 'object' && (typeof p.then  === 'function' || typeof p.catch === 'function')) {
    return true;
  }
  return false;
}
