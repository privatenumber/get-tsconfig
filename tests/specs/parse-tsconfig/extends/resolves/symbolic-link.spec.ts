import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfigJson, getTscTsconfig } from '../../../../utils.js';
import { parseTsconfig } from '#get-tsconfig';

const validate = async (directoryPath: string) => {
	const expectedTsconfig = await getTscTsconfig(directoryPath);
	delete expectedTsconfig.files;

	const tsconfig = parseTsconfig(path.join(directoryPath, 'tsconfig.json'));
	expect(tsconfig).toStrictEqual(expectedTsconfig);
};

export default testSuite(({ describe }) => {
	describe('symbolic link', ({ test }) => {
		test('extends symlink to file', async () => {
			await using fixture = await createFixture({
				'tsconfig.symlink-source.json': createTsconfigJson({
					compilerOptions: {
						jsx: 'react',
						allowJs: true,
					},
				}),
				'tsconfig.json': createTsconfigJson({
					extends: './tsconfig.symlink.json',
					compilerOptions: {
						strict: true,
					},
				}),
				'file.ts': '',
				'tsconfig.symlink.json': ({ symlink }) => symlink('./tsconfig.symlink-source.json'),
			});

			await validate(fixture.path);
		});

		test('extends file from symlink to directory', async () => {
			await using fixture = await createFixture({
				'symlink-source': {
					'tsconfig.json': createTsconfigJson({
						compilerOptions: {
							jsx: 'react',
							allowJs: true,
						},
					}),
				},
				'tsconfig.json': createTsconfigJson({
					extends: './symlink/tsconfig.json',
					compilerOptions: {
						strict: true,
					},
				}),
				'file.ts': '',
				symlink: ({ symlink }) => symlink('./symlink-source'),
			});

			await validate(fixture.path);
		});

		test('extends from symlink to file in origin directory', async () => {
			await using fixture = await createFixture({
				'symlink-source': {
					'tsconfig.main.json': createTsconfigJson({
						extends: './tsconfig.base.json',
						compilerOptions: {
							strict: true,
						},
					}),
				},
				project: {
					'tsconfig.base.json': createTsconfigJson({
						compilerOptions: {
							jsx: 'react',
							allowJs: true,
						},
					}),
					'file.ts': '',
					'tsconfig.json': ({ symlink }) => symlink('../symlink-source/tsconfig.main.json'),
				},
			});

			await validate(fixture.getPath('project'));
		});

		test('extends from file in symlinked directory to file in origin directory', async () => {
			await using fixture = await createFixture({
				'symlink-source': {
					'tsconfig.main.json': createTsconfigJson({
						extends: '../tsconfig.base.json',
						compilerOptions: {
							strict: true,
						},
					}),
				},
				project: {
					'tsconfig.base.json': createTsconfigJson({
						compilerOptions: {
							jsx: 'react',
							allowJs: true,
						},
					}),
					'tsconfig.json': createTsconfigJson({
						extends: './symlink/tsconfig.main.json',
						compilerOptions: {
							importHelpers: true,
						},
					}),
					'file.ts': '',
					symlink: ({ symlink }) => symlink('../symlink-source'),
				},
			});

			await validate(fixture.getPath('project'));
		});
	});
});
