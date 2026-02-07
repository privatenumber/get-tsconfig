const { readTsconfig } = require('get-tsconfig');

const tsconfigPath = process.argv[2];

try {
    const parsed = readTsconfig(tsconfigPath);
    console.log(JSON.stringify(parsed.config));
} catch (error) {
    console.error(error);
}
