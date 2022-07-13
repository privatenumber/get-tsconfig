import path from 'path';
import { getTsconfig } from '../../../src';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
// @ts-expect-error ESM module
import slash from 'slash';

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
	describe('find tsconfig', ({ test, describe }) => {
		describe('error cases', ({ test }) => {
			test('tsconfig not found', () => {
				const tsconfig = getTsconfig('/');

				expect(tsconfig).toBe(null);
			});

			test('non json file', async () => {
				const fixture = await createFixture({
					'tsconfig.json': 'asdf',
				});

				expect(() => getTsconfig(fixture.path)).toThrow('Failed to parse tsconfig at:');

				await fixture.rm();
			});
		});

		test('from cwd', async () => {
			const tsconfig = getTsconfig();
			expect(tsconfig?.path).toBe(slash(path.join(process.cwd(), 'tsconfig.json')));
		});

		test('from directory path', async () => {
			const fixture = await createFixture({
				'tsconfig.json': tsconfigJson,
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toStrictEqual({
				path: slash(path.join(fixture.path, 'tsconfig.json')),
				config: { compilerOptions },
			});

			await fixture.rm();
		});

		test('from index.js path', async () => {
			const fixture = await createFixture({
				'tsconfig.json': tsconfigJson,
			});

			const tsconfig = getTsconfig(path.join(fixture.path, 'index.js'));
			expect(tsconfig).toStrictEqual({
				path: slash(path.join(fixture.path, 'tsconfig.json')),
				config: { compilerOptions },
			});

			await fixture.rm();
		});

		test('custom name', async () => {
			const customName = 'tsconfig-custom-name.json';
			const fixture = await createFixture({
				[customName]: tsconfigJson,
			});

			const tsconfig = getTsconfig(fixture.path, customName);
			expect(tsconfig).toStrictEqual({
				path: slash(path.join(fixture.path, customName)),
				config: { compilerOptions },
			});

			await fixture.rm();
		});
	});
});
