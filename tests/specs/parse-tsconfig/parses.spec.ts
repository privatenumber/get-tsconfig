import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { readTsconfig } from '#get-tsconfig';
import { createTsconfigJson } from '../../utils/fixture-helpers.ts';
import { getTscTsconfig } from '../../utils/typescript-helpers.ts';

describe('parses tsconfig', () => {
	describe('errors', () => {
		test('non-existent path', async () => {
			expect(
				() => readTsconfig('non-existent-path'),
			).toThrow('Cannot resolve tsconfig at path: ');
		});

		test('empty file', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': '',
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});

		test('json invalid', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': 'asdf',
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			expect(parsedTsconfig.config).toStrictEqual({
				compilerOptions: {},
			});
		});

		test('json non-object', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': '"asdf"',
			});

			expect(
				() => readTsconfig(fixture.getPath('tsconfig.json')),
			).toThrow('Failed to parse tsconfig at');
		});

		test('json empty', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': '{}',
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});
	});

	test('parses a path', async () => {
		await using fixture = await createFixture({
			'file.ts': '',
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					moduleResolution: 'node10',
					isolatedModules: true,
					module: 'esnext',
					esModuleInterop: true,
					declaration: true,
					outDir: 'dist',
					declarationDir: 'dist-declaration',
					strict: true,
					target: 'esnext',
					rootDir: 'root-dir',
				},
			}),
		});

		const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
		const expectedTsconfig = await getTscTsconfig(fixture.path);
		delete expectedTsconfig.files;

		// TODO: TS 5.5 resolve excludes paths
		if (expectedTsconfig.exclude) {
			expectedTsconfig.exclude = expectedTsconfig.exclude.map(excludePath => excludePath.split('/').pop()!);
		}

		expect(expectedTsconfig).toStrictEqual(parsedTsconfig.config);
	});

	test('implicit config', async () => {
		await using fixture = await createFixture({
			'file.ts': '',
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					target: 'es2022',
					module: 'preserve',
				},
			}),
		});

		const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
		const expectedTsconfig = await getTscTsconfig(fixture.path);
		delete expectedTsconfig.files;

		expect(expectedTsconfig).toStrictEqual(parsedTsconfig.config);
	});

	describe('baseUrl', () => {
		test('relative path', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						baseUrl: '.',
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});

		test('absolute path', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						baseUrl: process.platform === 'win32' ? 'C:\\' : '/',
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});
	});

	describe('rewriteRelativeImportExtensions', () => {
		test('sets allowImportingTsExtensions implicitly', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						rewriteRelativeImportExtensions: true,
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});

		test('respects explicit allowImportingTsExtensions', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						rewriteRelativeImportExtensions: true,
						allowImportingTsExtensions: false,
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});

		test('does not set allowImportingTsExtensions when false', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						rewriteRelativeImportExtensions: false,
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});
	});

	describe('composite', () => {
		test('implies declaration and incremental', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						composite: true,
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});
	});

	describe('lib', () => {
		test('normalizes to lowercase', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						lib: ['ES2020', 'DOM'],
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});
	});

	describe('nodenext', () => {
		test('implies resolveJsonModule', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						module: 'nodenext',
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});
	});

	describe('useDefineForClassFields', () => {
		test('not implied when target is below ES2022', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						target: 'es5',
						module: 'node16',
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});
	});

	describe('module node18 and node20', () => {
		test('module: node18 implications', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						module: 'node18',
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});

		test('module: node20 implications', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						module: 'node20',
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});
	});

	describe('checkJs', () => {
		test('implies allowJs', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						checkJs: true,
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});
	});

	describe('exclude', () => {
		test('does not add outDir when exclude is explicit', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						outDir: 'dist',
					},
					exclude: ['node_modules'],
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});

		test('does not add outDir when exclude is empty array', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						outDir: 'dist',
					},
					exclude: [],
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});

		test('does not add outDir when exclude is inherited', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'base.json': createTsconfigJson({
					compilerOptions: {
						outDir: 'dist',
					},
					exclude: ['node_modules'],
				}),
				'tsconfig.json': createTsconfigJson({
					extends: './base.json',
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});

		test('auto-adds outDir when exclude is not specified', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						outDir: 'dist',
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			expect(parsedTsconfig.config.exclude).toStrictEqual(['dist']);
		});
	});

	test('cache', async () => {
		await using fixture = await createFixture({
			'file.ts': '',
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					baseUrl: '.',
					moduleResolution: 'node10',
					isolatedModules: true,
					module: 'esnext',
					esModuleInterop: true,
					declaration: true,
					outDir: 'dist',
					strict: true,
					target: 'esnext',
				},
			}),
		});

		const cache = new Map();
		const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'), {
			cache,
		});
		expect(cache.size).toBe(1);

		const expectedTsconfig = await getTscTsconfig(fixture.path);
		delete expectedTsconfig.files;

		// TODO: TS 5.5 resolve excludes paths
		if (expectedTsconfig.exclude) {
			expectedTsconfig.exclude = expectedTsconfig.exclude.map(excludePath => excludePath.split('/').pop()!);
		}

		expect(expectedTsconfig).toStrictEqual(parsedTsconfig.config);

		const parsedTsconfigCached = readTsconfig(fixture.getPath('tsconfig.json'), {
			cache,
		});
		expect(cache.size).toBe(1);

		expect(expectedTsconfig).toStrictEqual(parsedTsconfigCached.config);
	});

	describe('enum case normalization', () => {
		test('normalizes jsx to lowercase', async () => {
			await using fixture = await createFixture({
				'file.tsx': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						// @ts-expect-error testing mixed case input
						jsx: 'React-JSX',
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});

		test('normalizes moduleDetection to lowercase', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						// @ts-expect-error testing mixed case input
						moduleDetection: 'Force',
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});

		test('normalizes importsNotUsedAsValues to lowercase', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						// @ts-expect-error testing mixed case input
						importsNotUsedAsValues: 'Preserve',
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});

		test('normalizes newLine to lowercase', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						newLine: 'CRLF',
					},
				}),
			});

			const parsedTsconfig = readTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig.config).toStrictEqual(expectedTsconfig);
		});
	});
});
