const Promise = require('bluebird');

const Interactor = require('./interactor');

class Organizer extends Interactor {
  constructor(context) {
    super(context);
    this.interactors = [];
  }

  exec() {
    this.promise = Promise.each(this.interactors, (interactor) => {
      return interactor.exec(this.context).then((i) => {
        this.context = i.context;
      });
    }).then(() => this );
    
    return this.promise;
  }
}

module.exports = Organizer;
