import { Interactor, IRollback } from './interactor';
export declare abstract class Organizer<T extends object = {}> extends Interactor<T> implements IRollback {
    private currentInteractorIndex;
    constructor(context: T);
    abstract organize(): Array<new (context: T) => Interactor<T>>;
    createInteractor(i: new (context: T) => Interactor<T>): Interactor<T>;
    exec(): Promise<this>;
    rollback(): Promise<void> | Promise<{}>;
}
