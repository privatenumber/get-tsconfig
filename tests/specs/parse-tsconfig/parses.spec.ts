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
	});
});
