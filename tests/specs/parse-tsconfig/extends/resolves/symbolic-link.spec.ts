import fs from 'fs/promises';
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
			});

			await fs.symlink(fixture.getPath('tsconfig.symlink-source.json'), fixture.getPath('tsconfig.symlink.json'));

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
			});

			await fs.symlink(fixture.getPath('symlink-source'), fixture.getPath('symlink'));

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
				},
			});

			await fs.symlink(fixture.getPath('symlink-source/tsconfig.main.json'), fixture.getPath('project/tsconfig.json'));

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
				},
			});

			await fs.symlink(fixture.getPath('symlink-source'), fixture.getPath('project/symlink'));

			await validate(fixture.getPath('project'));
		});
	});
});
