/* States symbols, because why not */

const NEW = Symbol.for('NEW');
const BEFORE = Symbol.for('BEFORE');
const CALL = Symbol.for('CALL');
const AFTER = Symbol.for('AFTER');
const REJECTED = Symbol.for('REJECTED');
const ROLLBACK = Symbol.for('ROLLBACK');
const RESOLVED = Symbol.for('RESOLVED');

module.exports = {
  NEW,
  BEFORE,
  CALL,
  AFTER,
  REJECTED,
  ROLLBACK,
  RESOLVED,
};
