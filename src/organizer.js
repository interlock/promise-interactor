const Interactor = require('./interactor');
const states = require('./states');

const resolveSym = Symbol.for('resolve');
const rejectSym = Symbol.for('reject');

class Organizer extends Interactor {
  constructor(context) {
    super(context);
    this.currentInteractorIndex = -1;
  }

  organize() {
    // TODO setting this.interactors in constructor will be depreciated
    if (this.interactors) return this.interactors;
    throw new Error('organize must be implemented');
  }

  exec() {
    this.promise = new Promise((resolve, reject) => {
      this[resolveSym] = resolve;
      this[rejectSym] = reject;
      let root = Promise.resolve();
      if (typeof this.before === 'function') {
        this.state = states.BEFORE;
        root = root.then(() => {
          return this.before();
        });
      }
      this.state = states.CALL;
      // insert attempts at running each interactor
      try {
        this.organize().forEach((interactor, interactorIndex) => {
          this.currentInteractorIndex = interactorIndex;
          root = root.then(() => {
            return interactor.exec(this.context);
          }).then((i) => {
            this.context = i.context;
            return null;
          });
        });
      } catch (err) {
        this.reject(err);
        return null;
      }

      root.then(() => {
        this.resolve();
        return null;
      }).catch((err) => {
        this.reject(err);
      });
    });

    return this.promise;
  }

  rollback() {
    if (this.currentInteractorIndex <= 0) return Promise.resolve();
    const organizers = this.organize().slice(0, this.currentInteractorIndex).reverse();
    const promise = new Promise((resolve, reject) => {
      let root = Promise.resolve();
    
      try {
        organizers.forEach((interactor) => {

          const i = new interactor(this.context);
          if (typeof i.rollback === 'function') {
            root = root.then(() => {
              return i.rollback();
            });
          }
        });
      } catch (err) {
        return new Promise.reject(err);
      }
      
      root.then(resolve).catch(reject); 
    });
    
    return promise;
  }
}

module.exports = Organizer;
