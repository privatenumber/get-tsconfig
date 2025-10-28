import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfigJson } from '../../utils/fixture-helpers.js';
import { getTscTsconfig } from '../../utils/typescript-helpers.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('parses tsconfig', ({ describe, test }) => {
		describe('errors', ({ test }) => {
			test('non-existent path', async () => {
				expect(
					() => parseTsconfig('non-existent-path'),
				).toThrow('Cannot resolve tsconfig at path: ');
			});

			test('empty file', async () => {
				await using fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const parsedTsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(parsedTsconfig).toStrictEqual(expectedTsconfig);
			});

			test('json invalid', async () => {
				await using fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': 'asdf',
				});

				const parsedTsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(parsedTsconfig).toStrictEqual({
					compilerOptions: {},
				});
			});

			test('json non-object', async () => {
				await using fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': '"asdf"',
				});

				expect(
					() => parseTsconfig(fixture.getPath('tsconfig.json')),
				).toThrow('Failed to parse tsconfig at');
			});

			test('json empty', async () => {
				await using fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': '{}',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const parsedTsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(parsedTsconfig).toStrictEqual(expectedTsconfig);
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

			const parsedTsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			// TODO: TS 5.5 resolve excludes paths
			if (expectedTsconfig.exclude) {
				expectedTsconfig.exclude = expectedTsconfig.exclude.map(excludePath => excludePath.split('/').pop()!);
			}

			expect(expectedTsconfig).toStrictEqual(parsedTsconfig);
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

			const parsedTsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(expectedTsconfig).toStrictEqual(parsedTsconfig);
		});

		describe('baseUrl', ({ test }) => {
			test('relative path', async () => {
				await using fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': createTsconfigJson({
						compilerOptions: {
							baseUrl: '.',
						},
					}),
				});

				const parsedTsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				expect(parsedTsconfig).toStrictEqual(expectedTsconfig);
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

				const parsedTsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				expect(parsedTsconfig).toStrictEqual(expectedTsconfig);
			});
		});

		describe('rewriteRelativeImportExtensions', ({ test }) => {
			test('sets allowImportingTsExtensions implicitly', async () => {
				await using fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': createTsconfigJson({
						compilerOptions: {
							rewriteRelativeImportExtensions: true,
						},
					}),
				});

				const parsedTsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				expect(parsedTsconfig).toStrictEqual(expectedTsconfig);
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

				const parsedTsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				expect(parsedTsconfig).toStrictEqual(expectedTsconfig);
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

				const parsedTsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				expect(parsedTsconfig).toStrictEqual(expectedTsconfig);
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
			const parsedTsconfig = parseTsconfig(fixture.getPath('tsconfig.json'), cache);
			expect(cache.size).toBe(1);

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			// TODO: TS 5.5 resolve excludes paths
			if (expectedTsconfig.exclude) {
				expectedTsconfig.exclude = expectedTsconfig.exclude.map(excludePath => excludePath.split('/').pop()!);
			}

			expect(expectedTsconfig).toStrictEqual(parsedTsconfig);

			const parsedTsconfigCached = parseTsconfig(fixture.getPath('tsconfig.json'), cache);
			expect(cache.size).toBe(1);

			expect(expectedTsconfig).toStrictEqual(parsedTsconfigCached);
		});
	});
});
