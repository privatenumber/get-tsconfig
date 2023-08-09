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
				const fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const parsedTsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(parsedTsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('json invalid', async () => {
				const fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': 'asdf',
				});

				const parsedTsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(parsedTsconfig).toStrictEqual({
					compilerOptions: {},
				});

				await fixture.rm();
			});

			test('json non-object', async () => {
				const fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': '"asdf"',
				});

				expect(
					() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
				).toThrow('Failed to parse tsconfig at');

				await fixture.rm();
			});

			test('json empty', async () => {
				const fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': '{}',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const parsedTsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(parsedTsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});
		});

		test('parses a path', async () => {
			const fixture = await createFixture({
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
					},
				}),
			});

			const parsedTsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		describe('baseUrl', ({ test }) => {
			test('relative path', async () => {
				const fixture = await createFixture({
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

				await fixture.rm();
			});

			test('absolute path', async () => {
				const fixture = await createFixture({
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

				await fixture.rm();
			});
		});

		test('cache', async () => {
			const fixture = await createFixture({
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
			expect(cache.size).toBe(2);

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig).toStrictEqual(expectedTsconfig);

			const parsedTsconfigCached = parseTsconfig(path.join(fixture.path, 'tsconfig.json'), cache);
			expect(cache.size).toBe(2);

			expect(parsedTsconfigCached).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});
	});
});
