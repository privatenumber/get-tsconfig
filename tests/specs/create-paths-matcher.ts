import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { execaNode, type ExecaError } from 'execa';
import { getTsconfig, resolvePathAlias } from '#get-tsconfig';
import { createTsconfigJson } from '../utils/fixture-helpers.ts';
import { getTscResolution } from '../utils/typescript-helpers.ts';

/**
 * Resolution is tested against the TypeScript compiler using:
 * npx tsc --traceResolution --noEmit
 */

describe('paths', () => {
	describe('error cases', () => {
		test('no baseUrl or paths should be fine', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {},
				}),
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();
			expect(resolvePathAlias(tsconfig!, 'anything')).toStrictEqual([]);
		});

		test('empty results are independent arrays', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {},
				}),
			});

			const tsconfig = getTsconfig(fixture.path)!;
			const first = resolvePathAlias(tsconfig, 'a');
			const second = resolvePathAlias(tsconfig, 'b');

			// Mutating one result must not affect the other
			first.push('/poisoned');
			expect(second).toStrictEqual([]);
		});

		test('no baseUrl nor relative paths', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						paths: {
							'@': ['src'],
						},
					},
				}),
			});

			let throwsError = false;
			const errorMessage = 'Non-relative paths are not allowed when \'baseUrl\' is not set. Did you forget a leading \'./\'?';
			try {
				await getTscResolution('@', fixture.path);
			} catch (error) {
				throwsError = true;
				expect((error as ExecaError).stdout).toMatch(errorMessage);
			}
			expect(throwsError).toBe(true);

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();
			expect(() => resolvePathAlias(tsconfig!, 'x')).toThrow(errorMessage);
		});

		test('no baseUrl nor relative paths in extends', async () => {
			await using fixture = await createFixture({
				'some-dir2/tsconfig.json': createTsconfigJson({
					compilerOptions: {
						paths: {
							'@': ['src'],
						},
					},
				}),
				'some-dir/tsconfig.json': createTsconfigJson({
					extends: '../some-dir2/tsconfig.json',
				}),
				'tsconfig.json': createTsconfigJson({
					extends: './some-dir/tsconfig.json',
				}),
			});

			let throwsError = false;
			const errorMessage = 'Non-relative paths are not allowed when \'baseUrl\' is not set. Did you forget a leading \'./\'?';
			try {
				await getTscResolution('@', fixture.path);
			} catch (error) {
				throwsError = true;
				expect((error as ExecaError).stdout).toMatch(errorMessage);
			}
			expect(throwsError).toBe(true);

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();
			expect(() => resolvePathAlias(tsconfig!, 'x')).toThrow(errorMessage);
		});

		test('multiple * in pattern', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						paths: {
							'a/*/*': ['src'],
						},
					},
				}),
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();
			expect(() => resolvePathAlias(tsconfig!, 'x')).toThrow('Pattern \'a/*/*\' can have at most one \'*\' character.');
		});

		test('multiple * in substitution', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						paths: {
							'a/*': ['*/*'],
						},
					},
				}),
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();
			expect(() => resolvePathAlias(tsconfig!, 'x')).toThrow('Substitution \'*/*\' in pattern \'a/*\' can have at most one \'*\' character.');
		});

		test('no match', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						paths: {
							'no-match': ['./b'],
						},
					},
				}),
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();

			const matchTsconfig = tsconfig!;

			expect(matchTsconfig).toBeDefined();
			expect(resolvePathAlias(matchTsconfig, 'specifier')).toStrictEqual([]);
		});

		/**
		 * TypeScript falls back to baseUrl when no paths pattern matches.
		 * tryLoadModuleUsingPathsIfEligible returns undefined for unmatched
		 * patterns, then tryLoadModuleUsingBaseUrl runs as a separate step.
		 *
		 * Reference: https://github.com/microsoft/TypeScript/blob/main/src/compiler/moduleNameResolver.ts#L1550-L1556
		 */
		test('unmatched specifier falls back to baseUrl', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						baseUrl: '.',
						paths: {
							'@/*': ['./src/*'],
						},
					},
				}),
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();

			const matchTsconfig = tsconfig!;
			expect(matchTsconfig).toBeDefined();

			const fixturePath = fixture.path.replaceAll('\\', '/');
			expect(resolvePathAlias(matchTsconfig, '@libs/constants')).toStrictEqual([
				`${fixturePath}@libs/constants`,
			]);
		});
	});

	describe('baseUrl', () => {
		test('relative baseUrl', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						baseUrl: '.',
					},
				}),
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();

			const matchTsconfig = tsconfig!;
			expect(matchTsconfig).toBeDefined();

			const resolvedAttempts = await getTscResolution('exactMatch', fixture.path);
			expect(resolvePathAlias(matchTsconfig, 'exactMatch')).toStrictEqual([
				resolvedAttempts[0].filePath.slice(0, -3),
			]);
		});

		test('inherited from extends', async () => {
			await using fixture = await createFixture({
				'src/lib/file': '',
				'some-dir/tsconfig.json': createTsconfigJson({
					compilerOptions: {
						baseUrl: '..',
						paths: {
							$lib: [
								'src/lib',
							],
							'$lib/*': [
								'src/lib/*',
							],
						},
					},
				}),
				'tsconfig.json': createTsconfigJson({
					extends: './some-dir/tsconfig.json',
				}),
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();

			const matchTsconfig = tsconfig!;
			expect(matchTsconfig).toBeDefined();

			const resolvedAttempts = await getTscResolution('$lib', fixture.path);
			expect(resolvePathAlias(matchTsconfig, '$lib')).toStrictEqual([
				resolvedAttempts[0].filePath.slice(0, -3),
			]);
		});

		test('absolute baseUrl', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': ({ fixturePath }) => createTsconfigJson({
					compilerOptions: {
						baseUrl: fixturePath,
					},
				}),
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();

			const matchTsconfig = tsconfig!;
			expect(matchTsconfig).toBeDefined();

			const resolvedAttempts = await getTscResolution('exactMatch', fixture.path);
			expect(resolvePathAlias(matchTsconfig, 'exactMatch')).toStrictEqual([
				resolvedAttempts[0].filePath.slice(0, -3),
			]);
		});
	});

	test('exact match', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					paths: {
						exactMatch: ['./b'],
					},
				},
			}),
		});

		const tsconfig = getTsconfig(fixture.path);
		expect(tsconfig).toBeDefined();

		const matchTsconfig = tsconfig!;
		expect(matchTsconfig).toBeDefined();

		const resolvedAttempts = await getTscResolution('exactMatch', fixture.path);
		expect(resolvePathAlias(matchTsconfig, 'exactMatch')).toStrictEqual([
			resolvedAttempts[0].filePath.slice(0, -3),
		]);
	});

	// #17
	test('exact match with parent path', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					paths: {
						exactMatch: ['../src'],
					},
				},
			}),
		});

		const tsconfig = getTsconfig(fixture.path);
		expect(tsconfig).toBeDefined();

		const matchTsconfig = tsconfig!;
		expect(matchTsconfig).toBeDefined();

		const resolvedAttempts = await getTscResolution('exactMatch', fixture.path);
		expect(resolvePathAlias(matchTsconfig, 'exactMatch')).toStrictEqual([
			resolvedAttempts[0].filePath.slice(0, -3),
		]);
	});

	test('exact match with literal wildcard', async () => {
		await using fixture = await createFixture({
			'b/file': '',
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					paths: {
						exactMatch: ['./b/*'],
					},
				},
			}),
		});

		const tsconfig = getTsconfig(fixture.path);
		expect(tsconfig).toBeDefined();

		const matchTsconfig = tsconfig!;
		expect(tsconfig).toBeDefined();

		const resolvedAttempts = await getTscResolution('exactMatch', fixture.path);
		expect(resolvePathAlias(matchTsconfig, 'exactMatch')).toStrictEqual([
			resolvedAttempts[0].filePath.slice(0, -3),
		]);
	});

	test('prefix match', async () => {
		await using fixture = await createFixture({
			'prefixed/specifier': '',
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					paths: {
						'prefix-*': ['./prefixed/*'],
					},
				},
			}),
		});

		const tsconfig = getTsconfig(fixture.path);
		expect(tsconfig).toBeDefined();

		const matchTsconfig = tsconfig!;
		expect(tsconfig).toBeDefined();

		const resolvedAttempts = await getTscResolution('prefix-specifier', fixture.path);
		expect(resolvePathAlias(matchTsconfig, 'prefix-specifier')).toStrictEqual([
			resolvedAttempts[0].filePath.slice(0, -3),
		]);
	});

	// Runs in a subprocess so getTsconfig receives a relative path
	// from a different cwd — verifying that path.resolve() is applied
	// internally (regression test for https://github.com/privatenumber/get-tsconfig/issues/79)
	test('prefix match > nested directory', async () => {
		const distPath = pathToFileURL(path.resolve('dist/index.mjs')).href;

		await using fixture = await createFixture({
			'dir/tsconfig.json': createTsconfigJson({
				compilerOptions: {
					paths: {
						'@/*': ['./*'],
					},
				},
			}),
			'test.mjs': `
				import { getTsconfig, resolvePathAlias } from ${JSON.stringify(distPath)};
				const tsconfig = getTsconfig('./dir/tsconfig.json');
				if (!tsconfig) process.exit(1);
				console.log(JSON.stringify(resolvePathAlias(tsconfig, '@/file')));
			`,
		});

		const { stdout } = await execaNode(fixture.getPath('test.mjs'), [], { cwd: fixture.path });
		const matcherResult = JSON.parse(stdout);

		const resolvedAttempts = await getTscResolution('@/file', fixture.getPath('./dir'));
		expect(matcherResult).toStrictEqual([
			resolvedAttempts[0].filePath.slice(0, -3),
		]);
	});

	test('suffix match', async () => {
		await using fixture = await createFixture({
			'suffixed/specifier': '',
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					paths: {
						'*-suffix': ['./suffixed/*'],
					},
				},
			}),
		});

		const tsconfig = getTsconfig(fixture.path);
		expect(tsconfig).toBeDefined();

		const matchTsconfig = tsconfig!;
		expect(tsconfig).toBeDefined();

		const resolvedAttempts = await getTscResolution('specifier-suffix', fixture.path);
		expect(resolvePathAlias(matchTsconfig, 'specifier-suffix')).toStrictEqual([
			resolvedAttempts[0].filePath.slice(0, -3),
		]);
	});

	test('doesnt match current directory', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					paths: {
						'.': ['./a'],
					},
				},
			}),
		});

		const tsconfig = getTsconfig(fixture.path);
		expect(tsconfig).toBeDefined();

		const matchTsconfig = tsconfig!;

		expect(tsconfig).toBeDefined();
		expect(resolvePathAlias(matchTsconfig, '.')).toStrictEqual([]);
	});

	test('doesnt match parent directory', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					paths: {
						'..': ['./a'],
					},
				},
			}),
		});

		const tsconfig = getTsconfig(fixture.path);
		expect(tsconfig).toBeDefined();

		const matchTsconfig = tsconfig!;

		expect(tsconfig).toBeDefined();
		expect(resolvePathAlias(matchTsconfig, '..')).toStrictEqual([]);
	});

	test('doesnt match relative paths', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					paths: {
						'./relative': ['./a'],
					},
				},
			}),
		});

		const tsconfig = getTsconfig(fixture.path);
		expect(tsconfig).toBeDefined();

		const matchTsconfig = tsconfig!;

		expect(tsconfig).toBeDefined();
		expect(resolvePathAlias(matchTsconfig, './relative')).toStrictEqual([]);
	});

	test('matches absolute paths', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					paths: {
						'/absolute': ['./a'],
					},
				},
			}),
		});

		const tsconfig = getTsconfig(fixture.path);
		expect(tsconfig).toBeDefined();

		const matchTsconfig = tsconfig!;
		expect(tsconfig).toBeDefined();

		const resolvedAttempts = await getTscResolution('/absolute', fixture.path);
		expect(resolvePathAlias(matchTsconfig, '/absolute')).toStrictEqual([
			resolvedAttempts[0].filePath.slice(0, -3),
		]);
	});

	test('matches absolute target paths', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': ({ fixturePath, getPath }) => createTsconfigJson({
				compilerOptions: {
					baseUrl: fixturePath,
					paths: {
						dir: [getPath('dir')],
					},
				},
			}),
		});

		const tsconfig = getTsconfig(fixture.path);
		expect(tsconfig).toBeDefined();

		const matchTsconfig = tsconfig!;
		expect(tsconfig).toBeDefined();

		const resolvedAttempts = await getTscResolution('dir', fixture.path);
		expect(resolvePathAlias(matchTsconfig, 'dir')).toStrictEqual([
			resolvedAttempts[0].filePath.slice(0, -3),
		]);
	});

	test('matches path that starts with .', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					paths: {
						'.src': ['./src'],
					},
				},
			}),
		});

		const tsconfig = getTsconfig(fixture.path);
		expect(tsconfig).toBeDefined();

		const matchTsconfig = tsconfig!;
		expect(tsconfig).toBeDefined();

		const resolvedAttempts = await getTscResolution('.src', fixture.path);
		expect(resolvePathAlias(matchTsconfig, '.src')).toStrictEqual([
			resolvedAttempts[0].filePath.slice(0, -3),
		]);
	});

	describe('extends w/ no baseUrl', () => {
		test('extended config should resolve relative to self', async () => {
			await using fixture = await createFixture({
				tsconfigs: {
					'tsconfig.json': createTsconfigJson({
						compilerOptions: {
							paths: {
								'@': [
									'./file',
								],
							},
						},
					}),
				},
				'tsconfig.json': createTsconfigJson({
					extends: './tsconfigs/tsconfig.json',
				}),
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();

			const matchTsconfig = tsconfig!;
			expect(tsconfig).toBeDefined();

			const resolvedAttempts = await getTscResolution('@', fixture.path);
			expect(resolvePathAlias(matchTsconfig, '@')).toStrictEqual([
				resolvedAttempts[0].filePath.slice(0, -3),
			]);
		});

		test('extended config should implicitly resolve paths from self', async () => {
			await using fixture = await createFixture({
				tsconfigs: {
					'tsconfig.json': createTsconfigJson({
						compilerOptions: {
							paths: {
								'@': [
									'./file',
								],
							},
						},
					}),
				},
				'tsconfig.json': createTsconfigJson({
					extends: './tsconfigs/tsconfig.json',
				}),
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();

			const matchTsconfig = tsconfig!;
			expect(tsconfig).toBeDefined();

			const resolvedAttempts = await getTscResolution('@', fixture.path);
			expect(resolvePathAlias(matchTsconfig, '@')).toStrictEqual([
				resolvedAttempts[0].filePath.slice(0, -3),
			]);
		});

		test('extended config should implicitly resolve paths from self - complex', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'some-dir2/tsconfig.json': createTsconfigJson({
					compilerOptions: {
						paths: {
							'@': ['./a'],
						},
					},
				}),
				'some-dir/tsconfig.json': createTsconfigJson({
					extends: '../some-dir2/tsconfig.json',
				}),
				'tsconfig.json': createTsconfigJson({
					extends: './some-dir/tsconfig.json',
				}),
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();

			const matchTsconfig = tsconfig!;
			expect(tsconfig).toBeDefined();

			const resolvedAttempts = await getTscResolution('@', fixture.path);
			expect(resolvePathAlias(matchTsconfig, '@')).toStrictEqual([
				resolvedAttempts[0].filePath.slice(0, -3),
			]);
		});
	});

	describe('${configDir}', () => {
		test('resolves paths with ${configDir}', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						paths: {
							'#/*': ['${configDir}/src/*'],
						},
					},
				}),
				'src/index.ts': '',
			});

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).toBeDefined();

			const matchTsconfig = tsconfig!;
			expect(matchTsconfig).toBeDefined();

			const resolvedAttempts = await getTscResolution('#/index', fixture.path);
			expect(resolvePathAlias(matchTsconfig, '#/index')).toStrictEqual([
				resolvedAttempts[0].filePath.slice(0, -3),
			]);
		});
	});
});
