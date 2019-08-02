* Remove insulate in favour of:

import { makeModuleMembrane } from '@agoric/jessie';
const { imported, exportable } = makeModuleMembrane();
export const foo = exportable({});
const bar = imported($i_bar);
export default exportable(baz);

* General format of the interpreter/compilers in lang.

Convert lib to bundled ASTs.
Interpret bundled ASTs.
Futamura Projection

* '\xFF' syntax for Justin?

* Update `writeOutput` and `readInput` to be incremental (i.e. it can be called again to append to output or read next line from stdin).  Use them to implement a true repl.

* Snarf the whitelist.js libraries for nodejs.

* Use full SES!

* boot-peg doesn't identify syntax errors correctly.  Problem with tokenTypeList, which needs to match literals.

* Better document quasi-peg.js, especially the < foo > syntax and SKIP.

* Refactor and clean up boot-peg.js.  peg-utils.js is a possibility.

* Consider allowing `writeOutput` to create files if they are whitelisted in the `jesspipe` command line options.
