"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interactor_1 = require("./interactor");
const states_1 = require("./states");
class Organizer extends interactor_1.Interactor {
    constructor(context) {
        super(context);
        this.currentInteractorIndex = -1;
    }
    createInteractor(i) {
        return new i(this.context);
    }
    exec() {
        this.promise = new Promise((resolve, reject) => {
            this[interactor_1.resolveSym] = resolve;
            this[interactor_1.rejectSym] = reject;
            let root = Promise.resolve();
            if (interactor_1.isIBefore(this)) {
                this.state = states_1.States.BEFORE;
                root = root.then(() => {
                    if (interactor_1.isIBefore(this)) { // HACK double check because scoping kills the type inferance
                        return this.before();
                    }
                });
            }
            this.state = states_1.States.CALL;
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
            }
            catch (err) {
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
    rollback() {
        if (this.currentInteractorIndex <= 0) {
            return Promise.resolve();
        }
        const organizers = this.organize().slice(0, this.currentInteractorIndex).reverse();
        const promise = new Promise((resolve, reject) => {
            let root = Promise.resolve();
            try {
                organizers.forEach((interactor) => {
                    const i = new interactor(this.context);
                    if (interactor_1.isIRollback(i)) {
                        root = root.then(() => {
                            if (interactor_1.isIRollback(i)) {
                                return i.rollback();
                            }
                        });
                    }
                });
            }
            catch (err) {
                return Promise.reject(err);
            }
            root.then(() => resolve()).catch(reject);
        });
        return promise;
    }
}
exports.Organizer = Organizer;
