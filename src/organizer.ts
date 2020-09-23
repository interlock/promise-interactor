import {
  Interactor, interactorConstructor, IRollback,
  isIBefore, isIRollback, rejectSym, resolveSym,
} from './interactor';
import { States } from './states';

export type organizerConstructor<T extends object> = new (context: T) => Organizer<T>;

export abstract class Organizer<T extends object = {}> extends Interactor<T> implements IRollback {

  private currentInteractorIndex: number;

  public static exec<T extends object = any>(context: T): Promise<Organizer<T>> {
    const c = this as unknown as organizerConstructor<T>;
    const instance = new c(context);
    return instance.exec();
  }

  constructor(context: T) {
    super(context);
    this.currentInteractorIndex = -1;
  }

  public abstract organize(): Array<interactorConstructor<T>>;

  public createInteractor(i: interactorConstructor<T>): Interactor<T> {
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

  public async rollback(origError?: any) {
    if (this.currentInteractorIndex <= 0) {
      return Promise.resolve();
    }
    const organizers = this.organize().slice(0, this.currentInteractorIndex).reverse();

    let err: any;
    for (let i = 0; i < organizers.length; i++) {
      const interactor = organizers[i];
      const inter = new interactor(this.context);
      if (isIRollback(inter)) {
        try {
          const res = await inter.rollback();
        } catch (_err) {
          err = _err;
        }
      }
    }
  }
}
