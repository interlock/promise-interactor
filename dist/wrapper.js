"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const interactor_1 = require("./interactor");
function interactorWrapper(interactor, wrap, unwrap) {
    return class extends interactor_1.Interactor {
        constructor() {
            super(...arguments);
            this.defaultUnwrap = (context, origContext) => {
                Object.assign(origContext, context);
            };
        }
        call() {
            return __awaiter(this, void 0, void 0, function* () {
                if (unwrap === undefined) {
                    unwrap = this.defaultUnwrap;
                }
                const preContext = wrap(this.context);
                console.log(`pre: ${JSON.stringify(preContext)}`);
                const inst = new interactor(preContext);
                yield inst.exec();
                console.log(`post: ${JSON.stringify(inst.context)}`);
                unwrap(inst.context, this.context);
                this.resolve();
            });
        }
    };
}
exports.interactorWrapper = interactorWrapper;
