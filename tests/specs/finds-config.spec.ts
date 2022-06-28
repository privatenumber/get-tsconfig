import path from 'path';
import { testSuite, expect } from 'manten';
import slash from 'slash';
import { getTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('find tsconfig', ({ test }) => {
		test('from cwd', () => {
			const tsconfig = getTsconfig();

			expect(tsconfig).toStrictEqual({
				path: slash(path.join(process.cwd(), 'tsconfig.json')),
				config: {
					compilerOptions: {
						moduleResolution: 'node',
						isolatedModules: true,
						module: 'NodeNext',
						esModuleInterop: true,
						declaration: true,
						outDir: 'dist',
						strict: true,
						target: 'esnext',
					},
					include: ['src'],
				},
			});
		});

		test('from directory path', () => {
			const tsconfig = getTsconfig('./tests/fixtures');

			expect(tsconfig).toStrictEqual({
				path: 'tests/fixtures/tsconfig.json',
				config: {
					compilerOptions: {
						jsx: 'react',
						jsxFactory: 'h',
						strict: true,
					},
				},
			});
		});

		test('from tsconfig.json path', () => {
			const tsconfig = getTsconfig('./tests/fixtures/tsconfig.json');

			expect(tsconfig).toStrictEqual({
				path: 'tests/fixtures/tsconfig.json',
				config: {
					compilerOptions: {
						jsx: 'react',
						jsxFactory: 'h',
						strict: true,
					},
				},
			});
		});

		test('from index.js path', () => {
			const tsconfig = getTsconfig('./tests/fixtures/index.js');

			expect(tsconfig).toStrictEqual({
				path: 'tests/fixtures/tsconfig.json',
				config: {
					compilerOptions: {
						jsx: 'react',
						jsxFactory: 'h',
						strict: true,
					},
				},
			});
		});
	});
});
