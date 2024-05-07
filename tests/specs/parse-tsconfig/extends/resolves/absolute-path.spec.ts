import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfigJson, getTscTsconfig } from '../../../../utils.js';
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
			expect(tsconfig).toStrictEqual(expectedTsconfig);
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
			expect(tsconfig).toStrictEqual(expectedTsconfig);
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
			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});
	});
});
