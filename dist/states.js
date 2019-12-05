"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* States symbols, because why not */
var States;
(function (States) {
    States[States["UNKNOWN"] = 0] = "UNKNOWN";
    States[States["NEW"] = 1] = "NEW";
    States[States["BEFORE"] = 2] = "BEFORE";
    States[States["CALL"] = 3] = "CALL";
    States[States["AFTER"] = 4] = "AFTER";
    States[States["REJECTED"] = 5] = "REJECTED";
    States[States["ROLLBACK"] = 6] = "ROLLBACK";
    States[States["RESOLVED"] = 7] = "RESOLVED";
})(States = exports.States || (exports.States = {}));
