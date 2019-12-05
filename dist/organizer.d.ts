import { Interactor, IRollback } from './interactor';
export declare class Organizer<T extends object = {}> extends Interactor<T> implements IRollback {
    protected interactors: Array<new (context: T) => Interactor<T>>;
    private currentInteractorIndex;
    constructor(context: T);
    organize(): Array<new (context: T) => Interactor<T>>;
    createInteractor(i: new (context: T) => Interactor<T>): Interactor<T>;
    exec(): Promise<this>;
    rollback(): Promise<void> | Promise<{}>;
}
