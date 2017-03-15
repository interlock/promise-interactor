const Promise = require('bluebird');

const Interactor = require('./interactor');

class Organizer extends Interactor {
  constructor(context) {
    super(context);
    this.interactors = [];
  }

  exec() {
    this.promise = Promise.each(this.interactors, (interactor) => {
      return interactor.exec(this.context).promise.then((context) => {
        this.context = context;
      });
    });
    return this.promise;
  }
}

module.exports = Organizer;
