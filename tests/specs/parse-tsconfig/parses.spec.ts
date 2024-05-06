import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfigJson, getTscTsconfig } from '../../utils.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('parses tsconfig', ({ describe, test }) => {
		describe('errors', ({ test }) => {
			test('non-existent path', async () => {
				expect(
					() => parseTsconfig('non-existent-path'),
				).toThrow('Cannot resolve tsconfig at path: non-existent-path');
			});

			test('empty file', async () => {
				await using fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const parsedTsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(parsedTsconfig).toStrictEqual(expectedTsconfig);
			});

			test('json invalid', async () => {
				await using fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': 'asdf',
				});

				const parsedTsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
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
					() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
				).toThrow('Failed to parse tsconfig at');
			});

			test('json empty', async () => {
				await using fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': '{}',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const parsedTsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
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
						strict: true,
						target: 'esnext',
						rootDir: 'root-dir',
					},
				}),
			});

			const parsedTsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig).toStrictEqual(expectedTsconfig);
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

				const parsedTsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

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

				const parsedTsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

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
			const parsedTsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'), cache);
			expect(cache.size).toBe(1);

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig).toStrictEqual(expectedTsconfig);

			const parsedTsconfigCached = parseTsconfig(path.join(fixture.path, 'tsconfig.json'), cache);
			expect(cache.size).toBe(1);

			expect(parsedTsconfigCached).toStrictEqual(expectedTsconfig);
		});
	});
});
