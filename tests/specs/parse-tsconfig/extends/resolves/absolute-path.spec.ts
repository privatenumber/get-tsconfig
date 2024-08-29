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
			// TODO: TS 5.5 --showConfig returns extra default fields
			expect(expectedTsconfig).toMatchObject(tsconfig);
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
			// TODO: TS 5.5 --showConfig returns extra default fields
			expect(expectedTsconfig).toMatchObject(tsconfig);
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
			// TODO: TS 5.5 --showConfig returns extra default fields
			expect(expectedTsconfig).toMatchObject(tsconfig);
		});
	});
});
