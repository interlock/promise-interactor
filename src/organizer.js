const Promise = require('bluebird');

const Interactor = require('./interactor');

const resolveSym = Symbol.for('resolve');
const rejectSym = Symbol.for('reject');

class Organizer extends Interactor {
  constructor(context) {
    super(context);
    this.interactors = [];
  }

  exec() {
    this.promise = new Promise((resolve, reject) => {
      this[resolveSym] = resolve;
      this[rejectSym] = reject;
      this.state = 'CALL'
      let root = Promise.each(this.interactors, (interactor) => {
        return interactor.exec(this.context).then((i) => {
          this.context = i.context;
        });
      });

      root.then(() => {
        this.resolve();
      }).catch((err) => {
        this.reject(err);
      });
    });

    return this.promise;
  }
}

module.exports = Organizer;
