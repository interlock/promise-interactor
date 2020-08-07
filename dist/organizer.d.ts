import { Interactor, IRollback, interactorConstructor } from './interactor';
export declare abstract class Organizer<T extends object = {}> extends Interactor<T> implements IRollback {
    private currentInteractorIndex;
    constructor(context: T);
    abstract organize(): Array<interactorConstructor<T>>;
    createInteractor(i: interactorConstructor<T>): Interactor<T>;
    exec(): Promise<this>;
    rollback(): Promise<void> | Promise<{}>;
}
