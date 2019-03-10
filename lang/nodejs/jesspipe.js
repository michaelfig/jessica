#! /usr/bin/env ts-node
import mutableEnv from './globalEnv.mjs';
// Read and evaluate the specified module,
if (process.argv.length < 3) {
    throw Error(`You must specify a MODULE`);
}
const MODULE = process.argv[2] || '-';
const ARGV = process.argv.slice(2);
// Make a confined file loader specified by the arguments.
const dashdash = ARGV.indexOf('--');
const CAN_LOAD_ASSETS = makeSet([MODULE]);
if (dashdash >= 0) {
    ARGV.slice(dashdash + 1).forEach(file => CAN_LOAD_ASSETS.add(file));
}
import * as fs from 'fs';
import makeReadInput from '../../lib/readInput.mjs';
const rawReadInput = (path) => fs.readFileSync(path, { encoding: 'latin1' });
const readInput = makeReadInput(CAN_LOAD_ASSETS, rawReadInput);
// Make a confined file writer.
const writeOutput = (fname, str) => {
    if (fname !== '-') {
        slog.error `Cannot write to ${{ fname }}: must be -`;
    }
    process.stdout.write(str);
};
// Create a Jessie bootstrap environment for the endowments.
import bootEnv from '../../lib/boot-env.mjs';
const jessie = bootEnv(mutableEnv, readInput);
// Read, eval, print loop.
import repl from '../../lib/repl.mjs';
const doEval = (src, uri) => jessie.confine(src, jessie, { scriptName: uri });
repl(MODULE, (file) => Promise.resolve(readInput(file)), doEval, writeOutput, ARGV)
    .catch(e => {
    writeOutput('-', '/* FIXME: Stub */\n');
    slog.warn `Cannot evaluate ${JSON.stringify(MODULE)}: ${e}`;
});
