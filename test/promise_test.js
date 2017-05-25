const chai = require('chai');
const expect = chai.expect;

const promise = require('../src/promise');
const BlueBirdPromise = require('bluebird');

describe('promise', () => {
  context('isPromise', () => {

    it('detects built-in promise', () => {
      const p = new global.Promise((r) => { r(); });
      expect(promise.isPromise(p)).to.be.true;
    });

    it('detects bluebird as promise', () => {
      const p = new BlueBirdPromise((r) => { r(); });
      expect(promise.isPromise(p)).to.be.true;
    });

    it('does not thing an object is a promise', () => {
      expect(promise.isPromise({})).to.not.be.true;
    });

    it('returns false for undefined', () => {
      expect(promise.isPromise(undefined)).to.not.be.true;
    });
  });
});
