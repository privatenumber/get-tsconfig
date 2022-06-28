import path from 'path';
import { testSuite, expect } from 'manten';
import { getTscTsconfig } from '../../utils/tsc';
import { createFixture, tsconfigJson } from '../../utils/create-fixture';
import { parseTsconfig } from '#get-tsconfig'; // eslint-disable-line import/no-unresolved

export default testSuite(({ describe }) => {
	describe('parses tsconfig', ({ describe, test }) => {
		describe('errors', ({ test }) => {
			test('non-existent path', async () => {
				expect(
					() => parseTsconfig('non-existent-path'),
				).toThrow('Cannot resolve tsconfig at path: non-existent-path');
			});
		});

		test('parses a path', async () => {
			const fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': tsconfigJson({
					compilerOptions: {
						moduleResolution: 'node',
						isolatedModules: true,
						module: 'esnext',
						esModuleInterop: true,
						declaration: true,
						// outDir: 'dist',
						strict: true,
						target: 'esnext',
					},
				}),
			});

			const parsedTsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			expect(parsedTsconfig).toStrictEqual(expectedTsconfig);
		});
	});
});
