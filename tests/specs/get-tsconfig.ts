import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import slash from 'slash';
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
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toStrictEqual({
				path: slash(path.join(fixture.path, 'tsconfig.json')),
				config: { compilerOptions },
			});
		});

		test('from index.js path', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': tsconfigJson,
			});

			const tsconfig = getTsconfig(path.join(fixture.path, 'index.js'));
			expect(tsconfig).toStrictEqual({
				path: slash(path.join(fixture.path, 'tsconfig.json')),
				config: { compilerOptions },
			});
		});

		test('custom name', async () => {
			const customName = 'tsconfig-custom-name.json';
			await using fixture = await createFixture({
				[customName]: tsconfigJson,
			});

			const tsconfig = getTsconfig(fixture.path, customName);
			expect(tsconfig).toStrictEqual({
				path: slash(path.join(fixture.path, customName)),
				config: { compilerOptions },
			});
		});

		test('cache', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': tsconfigJson,
			});

			const expectedResult = {
				path: slash(path.join(fixture.path, 'tsconfig.json')),
				config: { compilerOptions },
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
