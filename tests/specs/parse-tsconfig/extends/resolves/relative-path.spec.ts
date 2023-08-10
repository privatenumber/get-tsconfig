import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfigJson, getTscTsconfig, createPackageJson } from '../../../../utils.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('relative path', ({ test }) => {
		test('extensionless file', async () => {
			const fixture = await createFixture({
				asdf: createTsconfigJson({
					compilerOptions: {
						jsx: 'react',
						allowJs: true,
					},
				}),
				'tsconfig.json': createTsconfigJson({
					extends: './asdf',
					compilerOptions: {
						strict: true,
					},
				}),
				'file.ts': '',
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('prefers exact match (extensionless file)', async () => {
			const fixture = await createFixture({
				asdf: createTsconfigJson({
					compilerOptions: {
						jsx: 'react',
						allowJs: true,
					},
				}),
				'asdf.json': createTsconfigJson({
					compilerOptions: {
						jsx: 'react-native',
						allowJs: true,
					},
				}),
				'tsconfig.json': createTsconfigJson({
					extends: './asdf',
					compilerOptions: {
						strict: true,
					},
				}),
				'file.ts': '',
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('arbitrary extension', async () => {
			const fixture = await createFixture({
				'asdf.ts': createTsconfigJson({
					compilerOptions: {
						jsx: 'react',
						allowJs: true,
					},
				}),
				'tsconfig.json': createTsconfigJson({
					extends: './asdf.ts',
					compilerOptions: {
						strict: true,
					},
				}),
				'file.ts': '',
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('parent directory', async () => {
			const fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						jsx: 'react',
						allowJs: true,
					},
				}),
				tests: {
					'tsconfig.json': createTsconfigJson({
						extends: '..',
						compilerOptions: {
							strict: true,
						},
					}),
					'file.ts': '',
				},
			});

			const testDirectory = `${fixture.path}/tests/`;
			const expectedTsconfig = await getTscTsconfig(testDirectory);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(testDirectory, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('shoud not resolve directory', async () => {
			const fixture = await createFixture({
				'directory/tsconfig.json': createTsconfigJson({
					compilerOptions: {
						jsx: 'react',
					},
				}),
				'tsconfig.json': createTsconfigJson({
					extends: './directory',
				}),
			});

			expect(
				() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
			).toThrow('File \'./directory\' not found.');

			await fixture.rm();
		});

		test('shoud not resolve directory even with package.json#tsconfig', async () => {
			const fixture = await createFixture({
				directory: {
					'package.json': createPackageJson({
						tsconfig: './tsconfig.json',
					}),
					'tsconfig.json': createTsconfigJson({
						compilerOptions: {
							jsx: 'react',
						},
					}),
				},
				'tsconfig.json': createTsconfigJson({
					extends: './directory',
				}),
			});

			expect(
				() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
			).toThrow('File \'./directory\' not found.');

			await fixture.rm();
		});

		test('outDir in extends', async () => {
			const fixture = await createFixture({
				'a/dep.json': createTsconfigJson({
					compilerOptions: {
						jsx: 'react-native',
						outDir: 'dist',
					},
				}),
				'tsconfig.json': createTsconfigJson({
					extends: './a/dep.json',
				}),
				'file.ts': '',
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			/**
			 * tsc should put the outDir in exclude  but doesn't happen
			 * when it's in extended tsconfig. I think this is a bug in tsc
			 */
			expectedTsconfig.exclude = ['a/dist'];

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('circular extends', async () => {
			const fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					extends: './tsconfig.json',
				}),
				'file.ts': '',
			});

			const errorMessage = 'Circularity detected while resolving configuration';
			await expect(
				getTscTsconfig(fixture.path),
			).rejects.toThrow(errorMessage);
			expect(
				() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
			).toThrow(errorMessage);

			await fixture.rm();
		});
	});
});
