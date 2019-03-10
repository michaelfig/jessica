function makeReadInput(CAN_LOAD_FILES: Set<string>, readInput: (file: string) => string) {
    const loader = (file: string) => {
        if (!CAN_LOAD_FILES.has(file)) {
            slog.error`${{file}} not in INFILE whitelist`;
        }
        return readInput(file);
    };
    return harden(loader);
}

export default harden(makeReadInput);
