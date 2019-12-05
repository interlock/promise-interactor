import { Interactor, IRollback, isIBefore, isIRollback, rejectSym, resolveSym } from './interactor';
import { States } from './states';

export class Organizer<T extends object = {}> extends Interactor<T> implements IRollback {
  protected interactors: Array<new(context: T) => Interactor<T>>;

  private currentInteractorIndex: number;

  constructor(context: T) {
    super(context);
    this.currentInteractorIndex = -1;
    this.interactors = [];
  }

  public organize(): Array<new(context: T) => Interactor<T>> {
    // TODO setting this.interactors in constructor will be depreciated
    if (this.interactors) {
      return this.interactors;
    }
    throw new Error('organize must be implemented');
  }

  public createInteractor(i: new(context: T) => Interactor<T>): Interactor<T> {
    return new i(this.context);
  }

  public exec(): Promise<this> {
    this.promise = new Promise((resolve, reject) => {
      this[resolveSym] = resolve;
      this[rejectSym] = reject;
      let root = Promise.resolve();
      if (isIBefore(this)) {
        this.state = States.BEFORE;
        root = root.then(() => {
          if (isIBefore(this)) { // HACK double check because scoping kills the type inferance
            return this.before();
          }
        });
      }
      this.state = States.CALL;
      // insert attempts at running each interactor
      try {
        this.organize().forEach((interactor, interactorIndex) => {
          this.currentInteractorIndex = interactorIndex;
          root = root.then(() => {
            const i = new interactor(this.context);
            return i.exec();
          }).then((i) => {
            this.context = i.context;
            return;
          });
        });
      } catch (err) {
        this.reject(err);
        return;
      }

      root.then(() => {
        this.resolve();
        return;
      }).catch((err) => {
        this.reject(err);
      });
    });

    return this.promise;
  }

  public rollback() {
    if (this.currentInteractorIndex <= 0) {
      return Promise.resolve();
    }
    const organizers = this.organize().slice(0, this.currentInteractorIndex).reverse();
    const promise = new Promise((resolve, reject) => {
      let root = Promise.resolve();

      try {
        organizers.forEach((interactor) => {
          const i = new interactor(this.context);
          if (isIRollback(i)) {
            root = root.then(() => {
              if (isIRollback(i)) {
                return i.rollback();
              }
            });
          }
        });
      } catch (err) {
        return Promise.reject(err);
      }

      root.then(() => resolve()).catch(reject);
    });

    return promise;
  }
}
