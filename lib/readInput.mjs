function makeReadInput(CAN_LOAD_FILES, readInput) {
    const loader = (file) => {
        if (!CAN_LOAD_FILES.has(file)) {
            slog.error `${{ file }} not in INFILE whitelist`;
        }
        return readInput(file);
    };
    return harden(loader);
}
export default harden(makeReadInput);
