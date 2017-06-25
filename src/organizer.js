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
      let root = Promise.resolve();
      if (typeof this.before === 'function') {
        this.state = 'BEFORE';
        root = root.then(() => {
          return this.before();
        });
      }
      this.state = 'CALL';
      // insert attempts at running each interactor
      this.interactors.forEach((interactor) => {
        root = root.then(() => {
          return interactor.exec(this.context);
        }).then((i) => {
          this.context = i.context;
          return null;
        });

      });

      root.then(() => {
        this.resolve();
        return null;
      }).catch((err) => {
        this.reject(err);
      });
    });

    return this.promise;
  }
}

module.exports = Organizer;
