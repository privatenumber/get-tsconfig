import path from 'node:path';
import { test, expect } from 'manten';
import spawn, { type SubprocessError } from 'nano-spawn';

const yarnPnpDirectory = path.resolve('./tests/fixtures/yarn-pnp');
const pnpParseTsconfig = async (
	tsconfigPath: string,
) => {
	const { stdout, stderr } = await spawn(
		process.execPath,
		['./index.js', tsconfigPath],
		{
			cwd: yarnPnpDirectory,
			env: {
				NODE_OPTIONS: '--require ./.pnp.cjs',
			},
		},
	).catch(error => error as SubprocessError);
	try {
		return JSON.parse(stdout);
	} catch {
		return stderr;
	}
};

// TODO: test pnp package exports
test('yarn pnp', async () => {
	const files = [
		'./tsconfig.package.json',
		'./tsconfig.package-path.json',
		'./tsconfig.package-path-directory.json',
		'./tsconfig.org-package.json',
	];

	const parsed = await Promise.all(files.map(file => pnpParseTsconfig(file)));
	parsed.forEach((tsconfig) => {
		expect(tsconfig).toStrictEqual({
			compilerOptions: {
				strict: true,
				jsx: 'react',
				noImplicitAny: true,
				noImplicitThis: true,
				strictNullChecks: true,
				strictFunctionTypes: true,
				strictBindCallApply: true,
				strictPropertyInitialization: true,
				strictBuiltinIteratorReturn: true,
				alwaysStrict: true,
				useUnknownInCatchVariables: true,
			},
		});
	});

	const missingExtends = await pnpParseTsconfig('./tsconfig.missing-extends.json');
	expect(missingExtends).toMatch('Error: File \'non-existent-package\' not found.');

	const invalidExtends = await pnpParseTsconfig('./tsconfig.invalid-extends.json');
	expect(invalidExtends).toMatch('Error: File \'fs/promises\' not found.');
});
