import path from 'node:path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import slash from 'slash';
import { getTscTsconfig } from '../utils/typescript-helpers.js';
import { getTsconfig, findTsconfig } from '#get-tsconfig';

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

		test('includes - matches when no include or exclude is set', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': JSON.stringify({
					compilerOptions: { strict: true },
				}),
				'src/index.ts': '',
			});

			const tsconfig = getTsconfig(
				fixture.getPath('src/index.ts'),
				'tsconfig.json',
				new Map(),
				true,
			);
			expect(tsconfig).not.toBe(null);
			expect(tsconfig!.config.compilerOptions!.strict).toBe(true);
		});

		test('includes - returns config that applies to file', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': JSON.stringify({
					compilerOptions: { strict: true },
					include: ['src'],
				}),
				'src/index.ts': '',
			});

			const tsconfig = getTsconfig(
				fixture.getPath('src/index.ts'),
				'tsconfig.json',
				new Map(),
				true,
			);
			expect(tsconfig).not.toBe(null);
			expect(tsconfig!.config.compilerOptions!.strict).toBe(true);
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

		test('includes - returns null when no config applies', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': JSON.stringify({
					include: ['other'],
				}),
				'src/index.ts': '',
			});

			const tsconfig = getTsconfig(
				fixture.getPath('src/index.ts'),
				'tsconfig.json',
				new Map(),
				true,
			);
			expect(tsconfig).toBe(null);
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

			// Default behavior returns nearest, even if it doesn't apply
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

	describe('findTsconfig', ({ test }) => {
		test('includes - returns config path that applies to file', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': JSON.stringify({
					include: ['src'],
				}),
				'src/index.ts': '',
			});

			const tsconfigPath = findTsconfig(
				fixture.getPath('src/index.ts'),
				'tsconfig.json',
				new Map(),
				true,
			);
			expect(tsconfigPath).toBe(slash(fixture.getPath('tsconfig.json')));
		});

		test('includes - skips config that excludes the file', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': JSON.stringify({
					compilerOptions: { strict: true },
				}),
				'nested/tsconfig.json': JSON.stringify({
					include: ['other'],
				}),
				'nested/src/index.ts': '',
			});

			const tsconfigPath = findTsconfig(
				fixture.getPath('nested/src/index.ts'),
				'tsconfig.json',
				new Map(),
				true,
			);
			expect(tsconfigPath).toBe(slash(fixture.getPath('tsconfig.json')));
		});

		test('includes - works with relative searchPath', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': JSON.stringify({
					include: ['src'],
				}),
				'src/index.ts': '',
			});

			const relativePath = path.relative(process.cwd(), fixture.getPath('src/index.ts'));
			const tsconfigPath = findTsconfig(
				relativePath,
				'tsconfig.json',
				new Map(),
				true,
			);
			expect(tsconfigPath).toBe(slash(fixture.getPath('tsconfig.json')));
		});

		test('includes - returns undefined when no config applies', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': JSON.stringify({
					include: ['other'],
				}),
				'src/index.ts': '',
			});

			const tsconfigPath = findTsconfig(
				fixture.getPath('src/index.ts'),
				'tsconfig.json',
				new Map(),
				true,
			);
			expect(tsconfigPath).toBeUndefined();
		});
	});
});
