// jesspipe.ts - Evaluate a Jessie script as part of a pipeline

/// <reference path="../../typings/jessie-proposed.d.ts"/>
/// <reference path="node_modules/@types/node/ts3.1/index.d.ts"/>

import { slog } from '@michaelfig/slog';
import { applyMethod, setComputedIndex } from './jessieDefaults.js';

import bootPeg from '../../lib/boot-peg.js';
import bootPegAst from '../../lib/boot-pegast.js';
import makePeg from '../../lib/quasi-peg.js';
import makeChainmail from '../../lib/quasi-chainmail.js';
import tagString from '../../lib/tag-string.js';


// Read and evaluate the specified module,
if (process.argv.length < 3) {
    slog.panic`You must specify a MODULE`;
}
const MODULE = process.argv[2] || '-';
const ARGV = process.argv.slice(2);

// Make a confined file loader specified by the arguments.
const dashdash = ARGV.indexOf('--');
const CAN_LOAD_ASSETS = new Set([MODULE]);
if (dashdash >= 0) {
    ARGV.slice(dashdash + 1).forEach(file => CAN_LOAD_ASSETS.add(file));
}

import * as fs from 'fs';
import makeReadInput from '../../lib/readInput.js';
const rawReadInput = (path: string) => fs.readFileSync(path, {encoding: 'latin1'});

const readInput = makeReadInput(CAN_LOAD_ASSETS, rawReadInput);

// Make a confined file writer.
let written = false;
const writeOutput = (fname: string, str: string) => {
    if (fname !== '-') {
        slog.error`Cannot write to ${{fname}}: must be -`;
    }
    written = true;
    process.stdout.write(str);
};

// Create a parser.

// Bootstrap a peg tag.
const pegTag = bootPeg<IPegTag<any>>(makePeg, bootPegAst);

// Stack up the parser.
const cmTag = makeChainmail(pegTag);
const tag = tagString(cmTag, MODULE);

const str = readInput(MODULE);
console.log(tag`${str}`);
