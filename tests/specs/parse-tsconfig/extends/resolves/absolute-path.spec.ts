import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { tsconfigJsonString, getTscTsconfig } from '../../../../utils.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('absolute path', ({ test }) => {
		test('absolute path', async () => {
			const fixture = await createFixture({
				'dep/tsconfig.json': tsconfigJsonString({
					compilerOptions: {
						strict: true,
						jsx: 'react',
					},
				}),
				'file.ts': '',
			});
			await fixture.writeFile('tsconfig.json', tsconfigJsonString({
				extends: path.join(fixture.path, 'dep/tsconfig.json'),
			}));

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('no extension', async () => {
			const fixture = await createFixture({
				'dep/tsconfig.json': tsconfigJsonString({
					compilerOptions: {
						strict: true,
						jsx: 'react',
					},
				}),
				'file.ts': '',
			});
			await fixture.writeFile('tsconfig.json', tsconfigJsonString({
				extends: path.join(fixture.path, 'dep/tsconfig'),
			}));

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('arbitrary extension', async () => {
			const fixture = await createFixture({
				'dep/tsconfig.tsx': tsconfigJsonString({
					compilerOptions: {
						strict: true,
						jsx: 'react',
					},
				}),
				'file.ts': '',
			});
			await fixture.writeFile('tsconfig.json', tsconfigJsonString({
				extends: path.join(fixture.path, 'dep/tsconfig.tsx'),
			}));

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});
	});
});
