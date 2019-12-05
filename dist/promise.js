"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Determine the least amount of functionality to be a valid promise
 * @arg {*} The promise in question
 * @return {boolean}
 */
function isPromise(p) {
    if (typeof p === 'object' && (typeof p.then === 'function' || typeof p.catch === 'function')) {
        return true;
    }
    return false;
}
exports.isPromise = isPromise;
