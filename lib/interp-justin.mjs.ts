import jsonEvaluators from './interp-json.mjs';
import {BINDING_GET, BINDING_NAME, BINDING_PARENT,
    doEval, err, Evaluator, getRef, IEvalContext} from './interp-utils.mjs';
import {qrepack} from './quasi-utils.mjs';

const justinEvaluators: Record<string, Evaluator> = {
    ...jsonEvaluators,
    'pre:+'(self: IEvalContext, expr: any[]) {
        return +doEval(self, expr);
    },
    'pre:-'(self: IEvalContext, expr: any[]) {
        return -doEval(self, expr);
    },
    'pre:~'(self: IEvalContext, expr: any[]) {
        return ~doEval(self, expr);
    },
    'pre:!'(self: IEvalContext, expr: any[]) {
        return !doEval(self, expr);
    },
    '**'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval ** bval;
    },
    '*'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval * bval;
    },
    '/'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval / bval;
    },
    '%'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval % bval;
    },
    '+'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval + bval;
    },
    '-'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval - bval;
    },
    '<<'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval << bval;
    },
    '>>>'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval >>> bval;
    },
    '>>'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval >> bval;
    },
    '<='(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval <= bval;
    },
    '<'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval < bval;
    },
    '>='(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval >= bval;
    },
    '>'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval > bval;
    },
    '!=='(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval !== bval;
    },
    '==='(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval === bval;
    },
    '&'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval & bval;
    },
    '^'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval ^ bval;
    },
    '|'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval | bval;
    },
    '&&'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval && bval;
    },
    '||'(self: IEvalContext, a: any[], b: any[]) {
        const aval = doEval(self, a);
        const bval = doEval(self, b);
        return aval || bval;
    },
    array(self: IEvalContext, elems: any[][]) {
        const arr = elems.reduce((prior, el) => {
            const val = doEval(self, el);
            if (el[0] === 'spread') {
                for (const v of val) {
                    prior.push(v);
                }
            } else {
                prior.push(val);
            }
            return prior;
        }, []);
        return arr;
    },
    call(self: IEvalContext, func: any[], args: any[][]) {
        const {getter, thisObj} = getRef(self, func);
        const evaledArgs = args.map((a) => doEval(self, a));
        const method = getter();
        return self.applyMethod(thisObj, method, evaledArgs);
    },
    cond(self: IEvalContext, c: any[], t: any[], e: any[]) {
        const cval = doEval(self, c);
        if (cval) {
            return doEval(self, t);
        }
        return doEval(self, e);
    },
    get(self: IEvalContext, objExpr: any[], id: string) {
        const obj = doEval(self, objExpr);
        return obj[id];
    },
    index(self: IEvalContext, objExpr: any[], expr: any[]) {
        const obj = doEval(self, objExpr);
        const index = doEval(self, expr);
        if (typeof index !== 'number') {
            err(self)`Index value ${{index}} is not numeric`;
        }
        return obj[index];
    },
    quasi(self: IEvalContext, parts: any[]) {
        const argsExpr = qrepack(parts);
        return argsExpr.map(arg => doEval(self, arg));
    },
    record(self: IEvalContext, propDefs: any[][]) {
        const obj: Record<string | number, any> = {};
        propDefs.forEach(b => {
            if (b[0] === 'spreadObj') {
                const spreader = doEval(self, b);
                for (const [name, val] of Object.entries(spreader)) {
                    self.setComputedIndex(obj, name, val);
                }
            } else {
                const [name, val] = doEval(self, b);
                self.setComputedIndex(obj, name, val);
            }
        });
        return obj;
    },
    spread(self: IEvalContext, arrExpr: any[][]) {
        const arr = doEval(self, arrExpr);
        return arr;
    },
    spreadObj(self: IEvalContext, objExpr: any[]) {
        const obj = doEval(self, objExpr);
        return obj;
    },
    tag(self: IEvalContext, tagExpr: any[], quasiExpr: any[]) {
        const {getter, thisObj} = getRef(self, tagExpr);
        const args = doEval(self, quasiExpr);
        return self.applyMethod(thisObj, getter(), args);
    },
    typeof(self: IEvalContext, expr: any[]) {
        if (expr[0] === 'use') {
            const [, name] = expr;
            let b = self.env();
            while (b !== undefined) {
                if (b[BINDING_NAME] === name) {
                    return typeof b[BINDING_GET]();
                }
                b = b[BINDING_PARENT];
            }
            // Special case: just return undefined on missing lookup.
            return undefined;
        }

        const val = doEval(self, expr);
        return typeof val;
    },
    use(self: IEvalContext, name: string) {
        let b = self.env();
        while (b !== undefined) {
            if (b[BINDING_NAME] === name) {
                return b[BINDING_GET]();
            }
            b = b[BINDING_PARENT];
        }
        err(self)`ReferenceError: ${{name}} is not defined`;
    },
    void(self: IEvalContext, expr: any[]) {
        doEval(self, expr);
        return undefined;
    },
};

export default justinEvaluators;
