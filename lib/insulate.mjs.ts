// Create an `insulate` function for use in Jessie endowments.
//
// Recursively freeze the root, a la harden.  If it is a function
// or contains a reachable property that is an function, that
// function will be replaced by a memoized hardened wrapper that
// insulates its argumens, return value, and any thrown exception.
//
// A baroque Proxy or frozen object cannot be insulated, but will still be
// hardened.  These are objects that cannot possibly contain mutable Jessie
// objects (since all Jessie objects have been insulated before export), so
// this incompleteness does not compromise Jessie.

type AnyFunction = (...args: any[]) => any;
const makeInsulate = (
    makeHarden: (naivePrepareObject: (obj: any) => void) => typeof harden,
    makeWrapper: (newInsulate: typeof insulate, fn: (...args: any[]) => any) => (...args: any[]) => any,
    setComputedIndex: (obj: Record<string | number, any>, index: string | number, value: any) => any) => {

    // Create a hardener that attempts to insulate functions on the way.
    const insulateHardener = makeHarden(tryWrapMethods);
    function tryWrapMethods(obj: any) {
        // Just do a best-effort insulating the object's methods.
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value !== 'function') {
                continue;
            }
            const wrapped = wrap(value as AnyFunction);
            try {
                // This means: obj[key] = wrapper;
                setComputedIndex(obj, key, wrapped);
            } catch (e) {
                // obj is a Proxy, or frozen object that blocked
                // our attempt to set its property.

                // It can't have originated from Jessie, so this is an
                // endowment or primitive from the parent environment
                // which wasn't added to harden's initialFringe.

                // We go on, as a best-effort attempt to try insulating the
                // properties we can.
                continue;
            }
        }
    }

    const _wrapperMap = makeWeakMap<AnyFunction, InsulatedFunction<AnyFunction>>();

    // FIXME: Needed for bootstrap.
    _wrapperMap.set(setComputedIndex, setComputedIndex);

    function wrap(fn: AnyFunction): InsulatedFunction<AnyFunction> {
        let wrapper = _wrapperMap.get(fn);
        if (!wrapper) {
            wrapper = makeWrapper(newInsulate, fn);

            // Memoize our results.
            _wrapperMap.set(fn, wrapper);
            _wrapperMap.set(wrapper, wrapper);

            // Copy in the wrapped function's properties (if any).
            // These are insulated in the next traversal.
            for (const [key, value] of Object.entries(fn)) {
                setComputedIndex(wrapper, key, value);
            }
        }
        return wrapper;
    }

    function newInsulate(root: any): Insulated<any> {
        // We may need to wrap the root before insulating its children.
        if (typeof root === 'function') {
            const wrapRoot = wrap(root);
            return insulateHardener(wrapRoot);
        }
        return insulateHardener(root);
    }

    return newInsulate;
};

export default makeInsulate;