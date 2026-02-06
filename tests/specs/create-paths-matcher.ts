import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import type { ExecaError } from 'execa';
import { createTsconfigJson } from '../utils/fixture-helpers.js';
import { getTscResolution } from '../utils/typescript-helpers.js';
import { getTsconfig, createPathsMatcher } from '#get-tsconfig';

/**
 * Resolution is tested against the TypeScript compiler using:
 * npx tsc --traceResolution --noEmit
 */

export default testSuite(({ describe }) => {
	describe('paths', ({ describe, test }) => {
		describe('error cases', ({ test }) => {
			test('no baseUrl or paths should be fine', async () => {
				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson({
						compilerOptions: {},
					}),
				});

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig).not.toBeNull();
				expect(createPathsMatcher(tsconfig!)).toBeNull();
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
				expect(tsconfig).not.toBeNull();
				expect(() => createPathsMatcher(tsconfig!)).toThrow(errorMessage);
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
				expect(tsconfig).not.toBeNull();
				expect(() => createPathsMatcher(tsconfig!)).toThrow(errorMessage);
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
				expect(tsconfig).not.toBeNull();
				expect(() => createPathsMatcher(tsconfig!)).toThrow('Pattern \'a/*/*\' can have at most one \'*\' character.');
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
				expect(tsconfig).not.toBeNull();
				expect(() => createPathsMatcher(tsconfig!)).toThrow('Substitution \'*/*\' in pattern \'a/*\' can have at most one \'*\' character.');
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
				expect(tsconfig).not.toBeNull();

				const matcher = createPathsMatcher(tsconfig!)!;

				expect(matcher).not.toBeNull();
				expect(matcher('specifier')).toStrictEqual([]);
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
				expect(tsconfig).not.toBeNull();

				const matcher = createPathsMatcher(tsconfig!)!;
				expect(matcher).not.toBeNull();

				const fixturePath = fixture.path.replaceAll('\\', '/');
				expect(matcher('@libs/constants')).toStrictEqual([
					`${fixturePath}@libs/constants`,
				]);
			});
		});

		describe('baseUrl', ({ test }) => {
			test('absolute path', async () => {
				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson({
						compilerOptions: {
							baseUrl: '.',
						},
					}),
				});

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig).not.toBeNull();

				const matcher = createPathsMatcher(tsconfig!)!;
				expect(matcher).not.toBeNull();

				const resolvedAttempts = await getTscResolution('exactMatch', fixture.path);
				expect(matcher('exactMatch')).toStrictEqual([
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
				expect(tsconfig).not.toBeNull();

				const matcher = createPathsMatcher(tsconfig!)!;
				expect(matcher).not.toBeNull();

				const resolvedAttempts = await getTscResolution('$lib', fixture.path);
				expect(matcher('$lib')).toStrictEqual([
					resolvedAttempts[0].filePath.slice(0, -3),
				]);
			});

			test('absolute path', async () => {
				await using fixture = await createFixture({
					'tsconfig.json': ({ fixturePath }) => createTsconfigJson({
						compilerOptions: {
							baseUrl: fixturePath,
						},
					}),
				});

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig).not.toBeNull();

				const matcher = createPathsMatcher(tsconfig!)!;
				expect(matcher).not.toBeNull();

				const resolvedAttempts = await getTscResolution('exactMatch', fixture.path);
				expect(matcher('exactMatch')).toStrictEqual([
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
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;
			expect(matcher).not.toBeNull();

			const resolvedAttempts = await getTscResolution('exactMatch', fixture.path);
			expect(matcher('exactMatch')).toStrictEqual([
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
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;
			expect(matcher).not.toBeNull();

			const resolvedAttempts = await getTscResolution('exactMatch', fixture.path);
			expect(matcher('exactMatch')).toStrictEqual([
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
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;
			expect(tsconfig).not.toBeNull();

			const resolvedAttempts = await getTscResolution('exactMatch', fixture.path);
			expect(matcher('exactMatch')).toStrictEqual([
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
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;
			expect(tsconfig).not.toBeNull();

			const resolvedAttempts = await getTscResolution('prefix-specifier', fixture.path);
			expect(matcher('prefix-specifier')).toStrictEqual([
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
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;
			expect(tsconfig).not.toBeNull();

			const resolvedAttempts = await getTscResolution('specifier-suffix', fixture.path);
			expect(matcher('specifier-suffix')).toStrictEqual([
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
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;

			expect(tsconfig).not.toBeNull();
			expect(matcher('.')).toStrictEqual([]);
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
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;

			expect(tsconfig).not.toBeNull();
			expect(matcher('..')).toStrictEqual([]);
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
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;

			expect(tsconfig).not.toBeNull();
			expect(matcher('./relative')).toStrictEqual([]);
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
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;
			expect(tsconfig).not.toBeNull();

			const resolvedAttempts = await getTscResolution('/absolute', fixture.path);
			expect(matcher('/absolute')).toStrictEqual([
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
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;
			expect(tsconfig).not.toBeNull();

			const resolvedAttempts = await getTscResolution('dir', fixture.path);
			expect(matcher('dir')).toStrictEqual([
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
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;
			expect(tsconfig).not.toBeNull();

			const resolvedAttempts = await getTscResolution('.src', fixture.path);
			expect(matcher('.src')).toStrictEqual([
				resolvedAttempts[0].filePath.slice(0, -3),
			]);
		});

		describe('extends w/ no baseUrl', ({ test }) => {
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
				expect(tsconfig).not.toBeNull();

				const matcher = createPathsMatcher(tsconfig!)!;
				expect(tsconfig).not.toBeNull();

				const resolvedAttempts = await getTscResolution('@', fixture.path);
				expect(matcher('@')).toStrictEqual([
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
				expect(tsconfig).not.toBeNull();

				const matcher = createPathsMatcher(tsconfig!)!;
				expect(tsconfig).not.toBeNull();

				const resolvedAttempts = await getTscResolution('@', fixture.path);
				expect(matcher('@')).toStrictEqual([
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
				expect(tsconfig).not.toBeNull();

				const matcher = createPathsMatcher(tsconfig!)!;
				expect(tsconfig).not.toBeNull();

				const resolvedAttempts = await getTscResolution('@', fixture.path);
				expect(matcher('@')).toStrictEqual([
					resolvedAttempts[0].filePath.slice(0, -3),
				]);
			});
		});

		describe('${configDir}', ({ test }) => {
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
				expect(tsconfig).not.toBeNull();

				const matcher = createPathsMatcher(tsconfig!)!;
				expect(matcher).not.toBeNull();

				const resolvedAttempts = await getTscResolution('#/index', fixture.path);
				expect(matcher('#/index')).toStrictEqual([
					resolvedAttempts[0].filePath.slice(0, -3),
				]);
			});
		});
	});
});
