const { parseTsconfig } = require('get-tsconfig');
const tests = [
	() => parseTsconfig('./tsconfig.package.json'),
	() => parseTsconfig('./tsconfig.package-path.json'),
	() => parseTsconfig('./tsconfig.package-path-directory.json'),
	() => parseTsconfig('./tsconfig.org-package.json'),
];

for (const test of tests) {
	try {
		console.log(test());
	} catch (error) {
		console.log(error.message);
		process.exitCode = 1;
	}
}
