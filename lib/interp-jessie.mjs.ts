// TODO: Hoisting of functionDecls.

interface IEvalOptions {
    [key: string]: any;
    scriptName?: string;
}

type Evaluator = (self: IEvalContext, ...args: any[]) => any;
enum Binding {
    parent = 0,
    name = 1,
    getter = 2,
    setter = 3,
}
interface IBinding {
    [Binding.parent]: IBinding | undefined;
    [Binding.name]: string;
    [Binding.getter]: () => any;
    [Binding.setter]?: (val: any) => typeof val;
}

interface IEval {
    0: string;
    1: IEval;
}

interface IEvalContext {
    dir: string;
    evalStack?: Hardened<IEval>;
    envp?: Hardened<IBinding>;
    import: (path: string) => any;
}

function makeConstBinding(self: IEvalContext, name: string, init?: any) {
    return harden<IBinding>([self.envp, name, () => init]);
}

function makeMutableBinding(self: IEvalContext, name: string, init?: any) {
    let slot = init;
    return harden<IBinding>([self.envp, name,
        () => slot, (val: any) => slot = val,
    ]);
}

function makeBinding(self: IEvalContext, name: string, init?: any, mutable = true) {
    let slot = init;
    const setter = mutable && ((val: any) => slot = val);
    return harden<IBinding>([self.envp, name, () => slot, setter]);
}

const evaluators: Record<string, Evaluator> = {
    call(self: IEvalContext, func: any[], args: any[][]) {
        const lambda = doEval(self, ...func);
        if (typeof lambda !== 'function') {
            slog.error`Expected a function, not ${{lambda}}`;
        }
        const evaledArgs = args.map((a) => doEval(self, ...a));
        return lambda(...evaledArgs);
    },
    data(self: IEvalContext, dataStruct: any) {
        return dataStruct;
    },
    use(self: IEvalContext, name: string) {
        let b = self.envp;
        while (b !== undefined) {
            if (b[Binding.name] === name) {
                return b[Binding.getter]();
            }
            b = b[Binding.parent];
        }
        slog.error`Cannot find binding for ${name} in current scope`;
    },
    block(self: IEvalContext, statements: any[][]) {
        // Produce the final value.
        return statements.reduce<any>((_, s) => doEval(self, ...s), undefined);
    },
    get(self: IEvalContext, objExpr: any[], index: any) {
        const obj = doEval(self, ...objExpr);
        return obj[index];
    },
    lambda(self: IEvalContext, argDefs: any[][], body: any[]) {
        // FIXME: Handle rest and default arguments.
        const formals = argDefs.map(adef => doEval(self, ...adef));
        const selfCopy = {...self};
        const lambda = (...args: any[]) => {
            return doApply(selfCopy, args, formals, body);
        };
        return lambda;
    },
    functionDecl(self: IEvalContext, def: any[], argDefs: any[][], body: any[]) {
        const lambda = evaluators.lambda(self, argDefs, body);
        const name = doEval(self, ...def);
        self.envp = makeBinding(self, name, lambda);
    },
    def(self: IEvalContext, name: string) {
        return name;
    },
    const(self: IEvalContext, binds: any[][]) {
        binds.forEach(b => doEval(self, ...b));
    },
    bind(self: IEvalContext, def, expr) {
        const name = doEval(self, ...def);
        const val = doEval(self, ...expr);
        self.envp = makeBinding(self, name, val);
    },
    module(self: IEvalContext, body: any[]) {
        const oldEnv = self.envp;
        try {
            let didExport = false, exported: any;
            for (const stmt of body) {
                if (stmt[0] === 'exportDefault') {
                    // Handle this production explicitly.
                    if (didExport) {
                        slog.error`Cannot use more than one "export default" statement`;
                    }
                    exported = doEval(self, ...stmt[1]);
                    didExport = true;
                } else {
                    doEval(self, ...stmt);
                }
            }
            return exported;
        } finally {
            self.envp = oldEnv;
        }
    },
    import(self: IEvalContext, def: any[], path: string) {
        const name = doEval(self, ...def);
        if (path[0] === '.' && path[1] === '/') {
            // Take the input relative to our current directory.
            path = `${self.dir}${path.slice(1)}`;
        }

        // Interpret with the same endowments.
        const val = self.import(path);
        self.envp = makeBinding(self, name, val);
    },
};

function doEval(self: IEvalContext, ...astArgs: any[]) {
    const [name, ...args] = astArgs;
    const ee = evaluators[name];
    if (!ee) {
        slog.error`No ${{name}} implementation`;
    }
    const oldEvalStack = self.evalStack;
    try {
        self.evalStack = [name, self.evalStack];
        return ee(self, ...args);
    } finally {
        self.evalStack = oldEvalStack;
    }
}

function doApply(self: IEvalContext, args: any[], formals: string[], body: any[]) {
    // Bind the formals.
    // TODO: Rest arguments.
    formals.forEach((f, i) => self.envp = makeMutableBinding(self, f, args[i]));

    // Evaluate the body.
    return doEval(self, ...body);
}

function makeInterpJessie(importer: (path: string, evaluator: (ast: any[]) => any) => any) {
    function interpJessie(ast: any[], endowments: Record<string, any>, options?: IEvalOptions): any {
        const lastSlash = options.scriptName === undefined ? -1 : options.scriptName.lastIndexOf('/');
        const thisDir = lastSlash < 0 ? '.' : options.scriptName.slice(0, lastSlash);

        const self: IEvalContext = {
            dir: thisDir,
            import: (path: string) =>
                importer(path, (iast: any[]) => interpJessie(iast, endowments, {scriptName: path})),
        };

        // slog.info`AST: ${{ast}}`;
        for (const [name, value] of Object.entries(endowments)) {
            // slog.info`Adding ${name}, ${value} to bindings`;
            self.envp = makeConstBinding(self, name, value);
        }
        return doEval(self, ...ast);
    }

    return harden(interpJessie);
}

export default harden(makeInterpJessie);
