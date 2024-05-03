import path from 'path';
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
				'file.ts': '',
			});
			await fixture.writeFile('tsconfig.json', createTsconfigJson({
				extends: path.join(fixture.path, 'dep/tsconfig.json'),
			}));

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
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
				'file.ts': '',
			});
			await fixture.writeFile('tsconfig.json', createTsconfigJson({
				extends: path.join(fixture.path, 'dep/tsconfig'),
			}));

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
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
				'file.ts': '',
			});
			await fixture.writeFile('tsconfig.json', createTsconfigJson({
				extends: path.join(fixture.path, 'dep/tsconfig.tsx'),
			}));

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});
	});
});
