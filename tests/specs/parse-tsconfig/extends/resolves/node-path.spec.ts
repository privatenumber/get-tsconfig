import path from 'node:path';
import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import spawn, { type SubprocessError } from 'nano-spawn';
import { createTsconfigJson, createPackageJson } from '../../../../utils/fixture-helpers.ts';

const getTsconfigPath = import.meta.resolve('#get-tsconfig');

const runNodePathFixture = async (
	fixturePath: string,
	nodePath: string,
) => {
	const result = await spawn(
		process.execPath,
		[path.join(fixturePath, 'test.mjs')],
		{
			cwd: fixturePath,
			env: {
				NODE_PATH: nodePath,
			},
		},
	).catch(error => error as SubprocessError);

	const exitCode = 'exitCode' in result ? result.exitCode : 0;

	const resolvedLine = result.stdout
		.split('\n')
		.find(line => line.startsWith('resolved '));

	const parsedLine = result.stdout
		.split('\n')
		.find(line => line.startsWith('parsed '));

	return {
		stderr: result.stderr,
		exitCode,
		resolvedLine,
		parsedLine,
	};
};

describe('NODE_PATH-backed hoisted store', () => {
	test('resolves dependency root', async () => {
		await using fixture = await createFixture({
			project: {
				'tsconfig.json': createTsconfigJson({
					extends: 'dep',
				}),
				'index.cjs': '',
			},
			'store/hash/node_modules/dep': {
				'package.json': createPackageJson({
					name: 'dep',
				}),
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						jsx: 'react',
					},
				}),
			},
			'test.mjs': `
				import path from 'node:path';
				import { createRequire } from 'node:module';
				import { readTsconfig } from ${JSON.stringify(getTsconfigPath)};

				const projectPath = path.resolve('project');
				const require = createRequire(path.join(projectPath, 'index.cjs'));
				console.log('resolved', require.resolve('dep/package.json'));

				const parsed = readTsconfig(path.join(projectPath, 'tsconfig.json'));
				console.log('parsed', JSON.stringify(parsed.config));
			`,
		});

		const nodePath = fixture.getPath('store/hash/node_modules');
		const {
			stderr,
			exitCode,
			resolvedLine,
			parsedLine,
		} = await runNodePathFixture(fixture.path, nodePath);

		expect(resolvedLine).toBeTruthy();
		expect(resolvedLine).toContain(nodePath);
		expect(exitCode).toBe(0);
		expect(stderr).toBe('');
		expect(parsedLine).toBeTruthy();
		expect(JSON.parse(parsedLine!.slice('parsed '.length))).toStrictEqual({
			compilerOptions: {
				jsx: 'react',
			},
		});
	});

	test('resolves package subpath exports', async () => {
		await using fixture = await createFixture({
			project: {
				'tsconfig.json': createTsconfigJson({
					extends: 'dep/config',
				}),
				'index.cjs': '',
			},
			'store/hash/node_modules/dep': {
				'package.json': createPackageJson({
					name: 'dep',
					exports: {
						'./config': './config.json',
					},
				}),
				'config.json': createTsconfigJson({
					compilerOptions: {
						jsx: 'react-jsx',
					},
				}),
			},
			'test.mjs': `
				import path from 'node:path';
				import { createRequire } from 'node:module';
				import { readTsconfig } from ${JSON.stringify(getTsconfigPath)};

				const projectPath = path.resolve('project');
				const require = createRequire(path.join(projectPath, 'index.cjs'));
				console.log('resolved', require.resolve('dep/config'));

				const parsed = readTsconfig(path.join(projectPath, 'tsconfig.json'));
				console.log('parsed', JSON.stringify(parsed.config));
			`,
		});

		const nodePath = fixture.getPath('store/hash/node_modules');
		const {
			stderr,
			exitCode,
			resolvedLine,
			parsedLine,
		} = await runNodePathFixture(fixture.path, nodePath);

		expect(resolvedLine).toBeTruthy();
		expect(resolvedLine).toContain(nodePath);
		expect(exitCode).toBe(0);
		expect(stderr).toBe('');
		expect(parsedLine).toBeTruthy();
		expect(JSON.parse(parsedLine!.slice('parsed '.length))).toStrictEqual({
			compilerOptions: {
				jsx: 'react-jsx',
			},
		});
	});

	test('resolves scoped package subpath exports', async () => {
		await using fixture = await createFixture({
			project: {
				'tsconfig.json': createTsconfigJson({
					extends: '@scope/dep/config',
				}),
				'index.cjs': '',
			},
			'store/hash/node_modules/@scope/dep': {
				'package.json': createPackageJson({
					name: '@scope/dep',
					exports: {
						'./config': './config.json',
					},
				}),
				'config.json': createTsconfigJson({
					compilerOptions: {
						jsx: 'react-jsxdev',
					},
				}),
			},
			'test.mjs': `
				import path from 'node:path';
				import { createRequire } from 'node:module';
				import { readTsconfig } from ${JSON.stringify(getTsconfigPath)};

				const projectPath = path.resolve('project');
				const require = createRequire(path.join(projectPath, 'index.cjs'));
				console.log('resolved', require.resolve('@scope/dep/config'));

				const parsed = readTsconfig(path.join(projectPath, 'tsconfig.json'));
				console.log('parsed', JSON.stringify(parsed.config));
			`,
		});

		const nodePath = fixture.getPath('store/hash/node_modules');
		const {
			stderr,
			exitCode,
			resolvedLine,
			parsedLine,
		} = await runNodePathFixture(fixture.path, nodePath);

		expect(resolvedLine).toBeTruthy();
		expect(resolvedLine).toContain(nodePath);
		expect(exitCode).toBe(0);
		expect(stderr).toBe('');
		expect(parsedLine).toBeTruthy();
		expect(JSON.parse(parsedLine!.slice('parsed '.length))).toStrictEqual({
			compilerOptions: {
				jsx: 'react-jsxdev',
			},
		});
	});

	test('resolves conditional package subpath exports', async () => {
		await using fixture = await createFixture({
			project: {
				'tsconfig.json': createTsconfigJson({
					extends: 'dep/config',
				}),
				'index.cjs': '',
			},
			'store/hash/node_modules/dep': {
				'package.json': createPackageJson({
					name: 'dep',
					exports: {
						'./config': {
							require: './config.json',
						},
					},
				}),
				'config.json': createTsconfigJson({
					compilerOptions: {
						jsx: 'preserve',
					},
				}),
			},
			'test.mjs': `
				import path from 'node:path';
				import { createRequire } from 'node:module';
				import { readTsconfig } from ${JSON.stringify(getTsconfigPath)};

				const projectPath = path.resolve('project');
				const require = createRequire(path.join(projectPath, 'index.cjs'));
				console.log('resolved', require.resolve('dep/config'));

				const parsed = readTsconfig(path.join(projectPath, 'tsconfig.json'));
				console.log('parsed', JSON.stringify(parsed.config));
			`,
		});

		const nodePath = fixture.getPath('store/hash/node_modules');
		const {
			stderr,
			exitCode,
			resolvedLine,
			parsedLine,
		} = await runNodePathFixture(fixture.path, nodePath);

		expect(resolvedLine).toBeTruthy();
		expect(resolvedLine).toContain(nodePath);
		expect(exitCode).toBe(0);
		expect(stderr).toBe('');
		expect(parsedLine).toBeTruthy();
		expect(JSON.parse(parsedLine!.slice('parsed '.length))).toStrictEqual({
			compilerOptions: {
				jsx: 'preserve',
			},
		});
	});
});
