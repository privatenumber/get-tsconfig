import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { readTsconfig } from '#get-tsconfig';
import { createTsconfigJson, createPackageJson } from '../../utils/fixture-helpers.ts';
import { getTscTsconfig } from '../../utils/typescript-helpers.ts';

describe('package.json#tsconfig', () => {
	test('package.json#tsconfig', async () => {
		await using fixture = await createFixture({
			'node_modules/dep': {
				'package.json': createPackageJson({
					tsconfig: './some-config.json',
				}),
				'some-config.json': createTsconfigJson({
					compilerOptions: {
						strict: true,
						jsx: 'react',
					},
				}),

				// should be ignored
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						jsx: 'preserve',
					},
				}),
			},
			'tsconfig.json': createTsconfigJson({
				extends: 'dep',
			}),
			'file.ts': '',
		});

		const expectedTsconfig = await getTscTsconfig(fixture.path);
		delete expectedTsconfig.files;

		const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

		expect(expectedTsconfig).toStrictEqual(tsconfig);
	});

	test('reads nested package.json#tsconfig', async () => {
		await using fixture = await createFixture({
			'node_modules/dep/some-directory': {
				'package.json': createPackageJson({
					// This is ignored because its not at root
					exports: {
						'./*': null,
					},
					tsconfig: './some-config.json',
				}),
				'some-config.json': createTsconfigJson({
					compilerOptions: {
						strict: true,
						jsx: 'react',
					},
				}),

				// should be ignored
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						jsx: 'preserve',
					},
				}),
			},
			'tsconfig.json': createTsconfigJson({
				extends: 'dep/some-directory',
			}),
			'file.ts': '',
		});

		const expectedTsconfig = await getTscTsconfig(fixture.path);
		delete expectedTsconfig.files;

		const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

		expect(expectedTsconfig).toStrictEqual(tsconfig);
	});
});
