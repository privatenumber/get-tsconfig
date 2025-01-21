import path from 'node:path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import slash from 'slash';
import { getTscTsconfig } from '../utils.js';
import { getTsconfig } from '#get-tsconfig';

const compilerOptions = {
	jsx: 'react',
	jsxFactory: 'h',
	strict: true,
};

const tsconfigJson = `
// comment at top
{
	/* compiler options */
	"compilerOptions": ${JSON.stringify(compilerOptions, null, '\t')}, // dangling-comma
} //comment at bottom
`;

export default testSuite(({ describe }) => {
	describe('find tsconfig', ({ test }) => {
		test('not found', () => {
			const tsconfig = getTsconfig('/');
			expect(tsconfig).toBe(null);
		});

		test('from cwd', async () => {
			const tsconfig = getTsconfig();
			expect(tsconfig?.path).toBe(slash(path.join(process.cwd(), 'tsconfig.json')));
		});

		test('from directory path', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': tsconfigJson,
				'a.ts': '',
			});

			const expected = await getTscTsconfig(fixture.path);
			delete expected.files;

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toStrictEqual({
				path: slash(fixture.getPath('tsconfig.json')),
				config: expected,
			});
		});

		test('from index.js path', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': tsconfigJson,
				'a.ts': '',
			});

			const expected = await getTscTsconfig(fixture.path);
			delete expected.files;

			const tsconfig = getTsconfig(fixture.getPath('index.js'));
			expect(tsconfig).toStrictEqual({
				path: slash(fixture.getPath('tsconfig.json')),
				config: expected,
			});
		});

		test('custom name', async () => {
			const customName = 'tsconfig-custom-name.json';
			await using fixture = await createFixture({
				[customName]: tsconfigJson,
				'a.ts': '',
			});

			const expected = await getTscTsconfig(fixture.path, customName);
			delete expected.files;

			const tsconfig = getTsconfig(fixture.path, customName);
			expect(tsconfig).toStrictEqual({
				path: slash(path.join(fixture.path, customName)),
				config: expected,
			});
		});

		test('cache', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': tsconfigJson,
				'a.ts': '',
			});

			const expected = await getTscTsconfig(fixture.path);
			delete expected.files;

			const expectedResult = {
				path: slash(fixture.getPath('tsconfig.json')),
				config: expected,
			};

			const cache = new Map();
			const tsconfig = getTsconfig(fixture.path, 'tsconfig.json', cache);
			expect(tsconfig).toStrictEqual(expectedResult);
			expect(cache.size).toBe(2);

			await fixture.rm('tsconfig.json');

			const tsconfigCacheHit = getTsconfig(fixture.path, 'tsconfig.json', cache);
			expect(tsconfigCacheHit).toStrictEqual(expectedResult);
		});
	});
});
