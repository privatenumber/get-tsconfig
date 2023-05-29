import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { tsconfigJsonString, getTscTsconfig } from '../../../../utils.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('relative path', ({ test }) => {
		test('extensionless file', async () => {
			const fixture = await createFixture({
				asdf: tsconfigJsonString({
					compilerOptions: {
						jsx: 'react',
						allowJs: true,
					},
				}),
				'tsconfig.json': tsconfigJsonString({
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
				asdf: tsconfigJsonString({
					compilerOptions: {
						jsx: 'react',
						allowJs: true,
					},
				}),
				'asdf.json': tsconfigJsonString({
					compilerOptions: {
						jsx: 'react-native',
						allowJs: true,
					},
				}),
				'tsconfig.json': tsconfigJsonString({
					extends: './asdf',
					compilerOptions: {
						strict: true,
					},
				}),
				'file.ts': '',
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			console.log(111, expectedTsconfig);
			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('arbitrary extension', async () => {
			const fixture = await createFixture({
				'asdf.ts': tsconfigJsonString({
					compilerOptions: {
						jsx: 'react',
						allowJs: true,
					},
				}),
				'tsconfig.json': tsconfigJsonString({
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
				'tsconfig.json': tsconfigJsonString({
					compilerOptions: {
						jsx: 'react',
						allowJs: true,
					},
				}),
				tests: {
					'tsconfig.json': tsconfigJsonString({
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
				'directory/tsconfig.json': tsconfigJsonString({
					compilerOptions: {
						jsx: 'react',
					},
				}),
				'tsconfig.json': tsconfigJsonString({
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
					'package.json': JSON.stringify({
						tsconfig: './tsconfig.json',
					}),
					'tsconfig.json': tsconfigJsonString({
						compilerOptions: {
							jsx: 'react',
						},
					}),
				},
				'tsconfig.json': tsconfigJsonString({
					extends: './directory',
				}),
			});

			expect(
				() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
			).toThrow('File \'./directory\' not found.');

			await fixture.rm();
		});
	});
});
