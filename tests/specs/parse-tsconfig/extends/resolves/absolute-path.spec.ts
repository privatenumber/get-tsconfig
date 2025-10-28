import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfigJson } from '../../../../utils/fixture-helpers.js';
import { getTscTsconfig } from '../../../../utils/typescript-helpers.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('absolute path', ({ test }) => {
		test('absolute path', async () => {
			await using fixture = await createFixture({
				'dep/tsconfig.json': createTsconfigJson({
					compilerOptions: {
						strict: true,
						jsx: 'react',
					},
				}),
				'tsconfig.json': ({ getPath }) => createTsconfigJson({
					extends: getPath('dep/tsconfig.json'),
				}),
				'file.ts': '',
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));

			expect(expectedTsconfig).toStrictEqual(tsconfig);
		});

		test('no extension', async () => {
			await using fixture = await createFixture({
				'dep/tsconfig.json': createTsconfigJson({
					compilerOptions: {
						strict: true,
						jsx: 'react',
					},
				}),
				'tsconfig.json': ({ getPath }) => createTsconfigJson({
					extends: getPath('dep/tsconfig'),
				}),
				'file.ts': '',
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));

			expect(expectedTsconfig).toStrictEqual(tsconfig);
		});

		test('arbitrary extension', async () => {
			await using fixture = await createFixture({
				'dep/tsconfig.tsx': createTsconfigJson({
					compilerOptions: {
						strict: true,
						jsx: 'react',
					},
				}),
				'tsconfig.json': ({ getPath }) => createTsconfigJson({
					extends: getPath('dep/tsconfig.tsx'),
				}),
				'file.ts': '',
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));

			expect(expectedTsconfig).toStrictEqual(tsconfig);
		});
	});
});
