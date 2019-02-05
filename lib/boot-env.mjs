import bootPeg from './boot-peg.mjs';
import bootPegAst from './boot-pegast.mjs';
import makePeg from './quasi-peg.mjs';
import makeJSON from './quasi-json.mjs';
import makeJustin from './quasi-justin.mjs';
import makeJessie from './quasi-jessie.mjs';

import interpJessie from './interp-jessie.mjs';

function tagString(template, ...args) {
    const cooked = args.reduce((prior, hole, i) => {
        prior.push(String(hole), template[i + 1]);
        return prior;
    }, [template[0]]);
    const tmpl = [cooked.join('')];
    const raw = args.reduce((prior, hole, i) => {
        prior.push(String(hole), template.raw[i + 1]);
        return prior;
    }, [template.raw[0]]);
    tmpl.raw = [raw.join('')];
    return tmpl;
}

function bootEnv(endowments) {
    // Bootstrap a peg tag.
    const {pegTag, metaCompile} = bootPeg(makePeg, bootPegAst);

    // Compare our pegTag output to bootPegAst, to help ensure it is
    // correct.  This doesn't defend against a malicious bootPeg,
    // but it does prevent silly mistakes.
    const reparsedPegAst = makePeg(pegTag, metaCompile);
    const a = JSON.stringify(bootPegAst, undefined, '  ');
    const b = JSON.stringify(reparsedPegAst, undefined, '  ');
    if (a !== b) {
        slog.error(`=== reparsedPegAst
${b}
`);
        throw `FATAL: reparsedPegAst does not match lib/boot-pegast.mjs`;
    }

    // YAAY!  If you got this far, you can uncomment the following
    // and overwrite lib/boot-pegast.mjs.
    // throw("// boot-pegast.mjs - AUTOMATICALLY GENERATED by boot-env.mjs\nexport default harden(" + b + ");\n");
    
    // Stack up the parser.
    const jsonTag = makeJSON(pegTag);

    // FIXME: Fix the parsers below.
    return 'FIXME: Fake success';
    const justinTag = makeJustin(pegTag.extends(jsonTag));
    const jessieTag = makeJessie(pegTag.extends(justinTag));

    const env = harden({
        ...endowments,
        confine: (src, evalenv, options) => {
            const ast = jessieTag(tagString`${src + '\n;'}`);
            return harden(interpJessie(ast, evalenv, options || {}));
        },
        confineExpr: (src, evalenv, options) => {
            const ast = jessieTag(tagString`${'(' + src + '\n)'}`);
            return harden(interpJessie.expr(ast, evalenv, options || {}));
        },
        eval: (src) => {
            const ast = jessieTag(tagString`${src}`);
            return harden(interpJessie(ast, env));
        },
    });
    return env;
}

export default harden(bootEnv);
