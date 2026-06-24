// CommonJS stub for the ESM-only `@themarkup/puppeteer-har` package, used ONLY
// under Jest. ts-jest runs node_modules code through a CommonJS runtime and
// cannot parse that package's native ESM (`export { ... }`), which would
// otherwise make every suite importing ../src/collector fail to load.
//
// This stub is never exercised by assertions: the collector integration tests
// that would capture a HAR are `it.skip(...)`, and `captureHar` defaults to
// false. It mirrors the real API shape — `captureNetwork(page)` resolves to a
// function that, when called with an output path, writes the HAR — so any
// future test that does enable HAR capture still gets a callable no-op.
module.exports = {
    captureNetwork: async () => {
        return async () => {
            /* no-op: the real implementation writes the HAR file to the given path */
        };
    },
};
