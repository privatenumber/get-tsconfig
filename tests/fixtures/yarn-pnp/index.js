const { readTsconfig } = require('get-tsconfig');

const tsconfigPath = process.argv[2];

try {
    // This harness is for testing extends resolution; version-aware
    // defaults would surface the dev-env typescript install in pnp
    // walk-up, which is unrelated.
    const parsed = readTsconfig(tsconfigPath, { typescriptVersion: false });
    console.log(JSON.stringify(parsed.config));
} catch (error) {
    console.error(error);
}
