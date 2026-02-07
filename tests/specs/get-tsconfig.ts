import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import slash from 'slash';
import { getTscTsconfig } from '../utils/typescript-helpers.js';
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
	describe('getTsconfig', ({ test }) => {
		test('not found', () => {
			const tsconfig = getTsconfig('/');
			expect(tsconfig).toBe(null);
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

		test('from file path', async () => {
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

		test('parses config with comments and trailing commas', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': tsconfigJson,
				'a.ts': '',
			});

			const expected = await getTscTsconfig(fixture.path);
			delete expected.files;

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig!.config).toStrictEqual(expected);
		});

		test('includes - skips config that excludes the file', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': JSON.stringify({
					compilerOptions: { strict: true },
				}),
				'nested/tsconfig.json': JSON.stringify({
					compilerOptions: { jsx: 'react' },
					include: ['other'],
				}),
				'nested/src/index.ts': '',
			});

			const tsconfig = getTsconfig(
				fixture.getPath('nested/src/index.ts'),
				'tsconfig.json',
				new Map(),
				true,
			);
			expect(tsconfig).not.toBe(null);
			expect(tsconfig!.config.compilerOptions!.strict).toBe(true);
		});

		test('includes - without option returns nearest config', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': JSON.stringify({
					compilerOptions: { strict: true },
				}),
				'nested/tsconfig.json': JSON.stringify({
					compilerOptions: { jsx: 'react' },
					include: ['other'],
				}),
				'nested/src/index.ts': '',
			});

			const tsconfig = getTsconfig(fixture.getPath('nested/src/index.ts'));
			expect(tsconfig).not.toBe(null);
			expect(tsconfig!.config.compilerOptions).toStrictEqual({
				jsx: 'react',
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
