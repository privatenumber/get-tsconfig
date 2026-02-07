import path from 'node:path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import slash from 'slash';
import { findTsconfig } from '#get-tsconfig';

const tsconfigJson = JSON.stringify({
	compilerOptions: { strict: true },
});

export default testSuite('findTsconfig', ({ test, describe }) => {
	test('not found', () => {
		const tsconfigPath = findTsconfig('/');
		expect(tsconfigPath).toBeUndefined();
	});

	test('from cwd', () => {
		const tsconfigPath = findTsconfig();
		expect(tsconfigPath).toBe(slash(path.join(process.cwd(), 'tsconfig.json')));
	});

	test('from directory path', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': tsconfigJson,
		});

		const tsconfigPath = findTsconfig(fixture.path);
		expect(tsconfigPath).toBe(slash(fixture.getPath('tsconfig.json')));
	});

	test('from file path', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': tsconfigJson,
			'src/index.ts': '',
		});

		const tsconfigPath = findTsconfig(fixture.getPath('src/index.ts'));
		expect(tsconfigPath).toBe(slash(fixture.getPath('tsconfig.json')));
	});

	test('custom name', async () => {
		const customName = 'tsconfig-custom-name.json';
		await using fixture = await createFixture({
			[customName]: tsconfigJson,
		});

		const tsconfigPath = findTsconfig(fixture.path, customName);
		expect(tsconfigPath).toBe(slash(path.join(fixture.path, customName)));
	});

	test('walks up parent directories', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': tsconfigJson,
			'a/b/c/index.ts': '',
		});

		const tsconfigPath = findTsconfig(fixture.getPath('a/b/c'));
		expect(tsconfigPath).toBe(slash(fixture.getPath('tsconfig.json')));
	});

	describe('includes', ({ test }) => {
		test('matches when no include or exclude is set', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': tsconfigJson,
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

		test('returns config path that applies to file', async () => {
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

		test('skips config that excludes the file', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': tsconfigJson,
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

		test('works with relative searchPath', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': JSON.stringify({
					include: ['src'],
				}),
				'src/index.ts': '',
			});

			const relativePath = path.relative(
				process.cwd(),
				fixture.getPath('src/index.ts'),
			);
			const tsconfigPath = findTsconfig(
				relativePath,
				'tsconfig.json',
				new Map(),
				true,
			);
			expect(tsconfigPath).toBe(slash(fixture.getPath('tsconfig.json')));
		});

		test('returns undefined when no config applies', async () => {
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
