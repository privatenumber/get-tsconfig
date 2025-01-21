const { parseTsconfig } = require('get-tsconfig');

const tsconfigPath = process.argv[2];

try {
    const parsed = parseTsconfig(tsconfigPath);
    console.log(JSON.stringify(parsed));
} catch (error) {
    console.error(error);
}
