import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { readTsconfig, getTsconfig, type TsconfigJson } from '#get-tsconfig';
import { createTsconfigJson } from '../utils/fixture-helpers.ts';
import { getTscTsconfig } from '../utils/typescript-helpers.ts';

const strictOptions = [
	'noImplicitAny',
	'noImplicitThis',
	'strictNullChecks',
	'strictFunctionTypes',
	'strictBindCallApply',
	'strictPropertyInitialization',
	'strictBuiltinIteratorReturn',
	'alwaysStrict',
	'useUnknownInCatchVariables',
] as const;

/**
 * Compares against `tsc -p tsconfig.json <args> --showConfig`, which applies
 * command-line options over the tsconfig before implied options are computed
 */
const expectMatchesTsc = async (
	tsconfig: Record<string, string>,
	compilerOptions: TsconfigJson.CompilerOptions,
	tscArgs: string[],
) => {
	await using fixture = await createFixture({
		'file.ts': '',
		...tsconfig,
	});

	const parsed = readTsconfig(fixture.getPath('tsconfig.json'), { compilerOptions });
	const expected = await getTscTsconfig(fixture.path, 'tsconfig.json', tscArgs);
	delete expected.files;

	// TODO: TS 5.5 resolve excludes paths
	if (expected.exclude) {
		expected.exclude = expected.exclude.map(excludePath => excludePath.split('/').pop()!);
	}

	expect(parsed.config).toStrictEqual(expected);
};

describe('compilerOptions overrides', () => {
	describe('matches tsc command-line options', () => {
		test('strict: false turns off strict: true', async () => {
			await expectMatchesTsc(
				{
					'tsconfig.json': createTsconfigJson({
						compilerOptions: { strict: true },
					}),
				},
				{ strict: false },
				['--strict', 'false'],
			);
		});

		test('strict: false turns off strict: true from extends', async () => {
			await expectMatchesTsc(
				{
					'base.json': createTsconfigJson({
						compilerOptions: { strict: true },
					}),
					'tsconfig.json': createTsconfigJson({
						extends: './base.json',
					}),
				},
				{ strict: false },
				['--strict', 'false'],
			);
		});

		test('strict: false keeps explicitly set strict-family options', async () => {
			await expectMatchesTsc(
				{
					'tsconfig.json': createTsconfigJson({
						compilerOptions: {
							strict: true,
							strictNullChecks: true,
						},
					}),
				},
				{ strict: false },
				['--strict', 'false'],
			);
		});

		test('module implies moduleResolution and esModuleInterop', async () => {
			await expectMatchesTsc(
				{
					'tsconfig.json': createTsconfigJson({
						compilerOptions: { module: 'esnext' },
					}),
				},
				{ module: 'nodenext' },
				['--module', 'nodenext'],
			);
		});

		test('target implies useDefineForClassFields', async () => {
			await expectMatchesTsc(
				{
					'tsconfig.json': createTsconfigJson({
						compilerOptions: { target: 'es5' },
					}),
				},
				{ target: 'es2022' },
				['--target', 'es2022'],
			);
		});

		// tsc rejects `--composite` on the command line (TS6230), so compare
		// against the same option written in the tsconfig
		test('composite implies declaration and incremental', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({}),
				'tsconfig.composite.json': createTsconfigJson({
					compilerOptions: { composite: true },
				}),
			});

			const parsed = readTsconfig(fixture.getPath('tsconfig.json'), {
				compilerOptions: { composite: true },
			});
			const expected = await getTscTsconfig(fixture.path, 'tsconfig.composite.json');
			delete expected.files;

			expect(parsed.config).toStrictEqual(expected);
		});

		test('verbatimModuleSyntax implies isolatedModules', async () => {
			await expectMatchesTsc(
				{
					'tsconfig.json': createTsconfigJson({
						compilerOptions: { module: 'esnext' },
					}),
				},
				{ verbatimModuleSyntax: true },
				['--verbatimModuleSyntax'],
			);
		});

		test('checkJs implies allowJs', async () => {
			await expectMatchesTsc(
				{
					'tsconfig.json': createTsconfigJson({}),
				},
				{ checkJs: true },
				['--checkJs'],
			);
		});

		test('outDir is added to the default exclude', async () => {
			await expectMatchesTsc(
				{
					'tsconfig.json': createTsconfigJson({
						compilerOptions: { outDir: 'dist' },
					}),
				},
				{ outDir: 'out' },
				['--outDir', 'out'],
			);
		});
	});

	describe('TypeScript 6 defaults', () => {
		// tsc 6.0.3: `tsc -p tsconfig.json --strict false --showConfig` lists
		// every strict-family flag as false; none may stay true here
		test('strict: false turns off the default strict', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({}),
			});

			const { config } = readTsconfig(fixture.getPath('tsconfig.json'), {
				typescriptVersion: '6.0.0',
				compilerOptions: { strict: false },
			});

			expect(config.compilerOptions!.strict).toBe(false);
			for (const key of strictOptions) {
				expect(config.compilerOptions![key]).toBe(undefined);
			}
		});

		test('strict: false keeps explicitly set strict-family options', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: { strictNullChecks: true },
				}),
			});

			const { config } = readTsconfig(fixture.getPath('tsconfig.json'), {
				typescriptVersion: '6.0.0',
				compilerOptions: { strict: false },
			});

			expect(config.compilerOptions!.strict).toBe(false);
			expect(config.compilerOptions!.strictNullChecks).toBe(true);
			expect(config.compilerOptions!.noImplicitAny).toBe(undefined);
		});

		test('overrides count as user-set for version defaults', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({}),
			});

			const { config } = readTsconfig(fixture.getPath('tsconfig.json'), {
				typescriptVersion: '6.0.0',
				compilerOptions: {
					target: 'es2022',
					types: ['node'],
				},
			});

			expect(config.compilerOptions).toMatchObject({
				target: 'es2022',
				types: ['node'],
				useDefineForClassFields: true,
			});
		});
	});

	describe('paths', () => {
		test('resolve as if written in the root tsconfig', async () => {
			const compilerOptions = {
				outDir: 'out',
				rootDir: './src/../src',
				baseUrl: '.',
				paths: {
					'#/*': ['./src/*'],
				},
				declarationDir: '${configDir}/types',
			};

			await using fixture = await createFixture({
				'base/tsconfig.json': createTsconfigJson({
					compilerOptions: { outDir: 'base-out' },
				}),
				'project/tsconfig.json': createTsconfigJson({
					extends: '../base/tsconfig.json',
				}),
				'written/tsconfig.json': createTsconfigJson({
					extends: '../base/tsconfig.json',
					compilerOptions,
				}),
			});

			const overridden = readTsconfig(fixture.getPath('project/tsconfig.json'), {
				typescriptVersion: false,
				compilerOptions,
			});
			const written = readTsconfig(fixture.getPath('written/tsconfig.json'), {
				typescriptVersion: false,
			});

			expect(overridden.config).toStrictEqual(written.config);
			expect(overridden.config.compilerOptions).toMatchObject({
				outDir: './out',
				rootDir: './src',
				declarationDir: './types',
			});
		});
	});

	describe('without overrides', () => {
		test('undefined values are ignored', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: { strict: true },
				}),
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const expected = readTsconfig(tsconfigPath, { typescriptVersion: '6.0.0' });
			const parsed = readTsconfig(tsconfigPath, {
				typescriptVersion: '6.0.0',
				compilerOptions: { strict: undefined },
			});

			expect(parsed.config).toStrictEqual(expected.config);
		});

		test('shared cache is not affected by overrides', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: { strict: true },
				}),
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const expected = readTsconfig(tsconfigPath);

			const cache = new Map();
			const overridden = readTsconfig(tsconfigPath, {
				cache,
				compilerOptions: { strict: false },
			});
			const cacheKeys = [...cache.keys()];
			const parsed = readTsconfig(tsconfigPath, { cache });

			expect(overridden.config.compilerOptions!.noImplicitAny).toBe(undefined);
			expect(parsed.config).toStrictEqual(expected.config);
			expect([...cache.keys()]).toStrictEqual(cacheKeys);
		});
	});

	describe('getTsconfig', () => {
		test('applies overrides', async () => {
			await using fixture = await createFixture({
				'src/index.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: { strict: true },
				}),
			});

			for (const includes of [false, true]) {
				const result = getTsconfig(fixture.getPath('src/index.ts'), {
					includes,
					compilerOptions: { strict: false },
				});

				expect(result!.config.compilerOptions).toStrictEqual({ strict: false });
			}
		});
	});
});
