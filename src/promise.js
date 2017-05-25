/**
 * Determine the least amount of functionality to be a valid promise
 * @arg {*} The promise in question
 * @return {boolean}
 */
const isPromise = function(p) {
  if (typeof p === 'object' && (typeof p.then  === 'function' || typeof p.catch === 'function')) {
    return true;
  }
  return false;
};

module.exports = { isPromise };
