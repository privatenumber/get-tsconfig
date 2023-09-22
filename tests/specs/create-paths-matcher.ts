import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfigJson, getTscResolution } from '../utils.js';
import { getTsconfig, createPathsMatcher } from '#get-tsconfig';

/**
 * Resolution is tested against the TypeScript compiler using:
 * npx tsc --traceResolution --noEmit
 */

export default testSuite(({ describe }) => {
	describe('paths', ({ describe, test }) => {
		describe('error cases', ({ test }) => {
			test('no baseUrl or paths should be fine', async () => {
				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson({
						compilerOptions: {},
					}),
				});

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig).not.toBeNull();
				expect(createPathsMatcher(tsconfig!)).toBeNull();

				await fixture.rm();
			});

			test('no baseUrl nor relative paths', async () => {
				const fixture = await createFixture({
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
					expect((error as any).stdout).toMatch(errorMessage);
				}
				expect(throwsError).toBe(true);

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig).not.toBeNull();
				expect(() => createPathsMatcher(tsconfig!)).toThrow(errorMessage);

				await fixture.rm();
			});

			test('no baseUrl nor relative paths in extends', async () => {
				const fixture = await createFixture({
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
					expect((error as any).stdout).toMatch(errorMessage);
				}
				expect(throwsError).toBe(true);

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig).not.toBeNull();
				expect(() => createPathsMatcher(tsconfig!)).toThrow(errorMessage);

				await fixture.rm();
			});

			test('multiple * in pattern', async () => {
				const fixture = await createFixture({
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

				await fixture.rm();
			});

			test('multiple * in substitution', async () => {
				const fixture = await createFixture({
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

				await fixture.rm();
			});

			test('no match', async () => {
				const fixture = await createFixture({
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

				await fixture.rm();
			});
		});

		describe('baseUrl', ({ test }) => {
			test('baseUrl', async () => {
				const fixture = await createFixture({
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

				await fixture.rm();
			});

			test('inherited from extends', async () => {
				const fixture = await createFixture({
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

				await fixture.rm();
			});

			test('absolute path', async () => {
				const fixture = await createFixture();
				await fixture.writeFile(
					'tsconfig.json',
					createTsconfigJson({
						compilerOptions: {
							baseUrl: fixture.path,
						},
					}),
				);

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig).not.toBeNull();

				const matcher = createPathsMatcher(tsconfig!)!;
				expect(matcher).not.toBeNull();

				const resolvedAttempts = await getTscResolution('exactMatch', fixture.path);
				expect(matcher('exactMatch')).toStrictEqual([
					resolvedAttempts[0].filePath.slice(0, -3),
				]);

				await fixture.rm();
			});
		});

		test('exact match', async () => {
			const fixture = await createFixture({
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

			await fixture.rm();
		});

		// #17
		test('exact match with parent path', async () => {
			const fixture = await createFixture({
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

			await fixture.rm();
		});

		test('exact match with literal wildcard', async () => {
			const fixture = await createFixture({
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

			await fixture.rm();
		});

		test('prefix match', async () => {
			const fixture = await createFixture({
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

			await fixture.rm();
		});

		test('suffix match', async () => {
			const fixture = await createFixture({
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

			await fixture.rm();
		});

		test('doesnt match current directory', async () => {
			const fixture = await createFixture({
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

			await fixture.rm();
		});

		test('doesnt match parent directory', async () => {
			const fixture = await createFixture({
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

			await fixture.rm();
		});

		test('doesnt match relative paths', async () => {
			const fixture = await createFixture({
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

			await fixture.rm();
		});

		test('matches absolute paths', async () => {
			const fixture = await createFixture({
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

			await fixture.rm();
		});

		test('matches absolute target paths', async () => {
			const fixture = await createFixture();

			await fixture.writeFile(
				'tsconfig.json',
				createTsconfigJson({
					compilerOptions: {
						baseUrl: fixture.path,
						paths: {
							dir: [path.join(fixture.path, 'dir')],
						},
					},
				}),
			);

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;
			expect(tsconfig).not.toBeNull();

			const resolvedAttempts = await getTscResolution('dir', fixture.path);
			expect(matcher('dir')).toStrictEqual([
				resolvedAttempts[0].filePath.slice(0, -3),
			]);

			await fixture.rm();
		});

		test('matches path that starts with .', async () => {
			const fixture = await createFixture({
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

			await fixture.rm();
		});

		// test('extended config should resolve relative to self', async () => {
		// 	const fixture = await createFixture({
		// 		tsconfigs: {
		// 			'tsconfig.json': createTsconfigJson({
		// 				compilerOptions: {
		// 					paths: {
		// 						'#imports': [
		// 							'./imports',
		// 						],
		// 					},
		// 				},
		// 			}),
		// 		},
		// 		'tsconfig.json': createTsconfigJson({
		// 			extends: './tsconfigs/tsconfig.json',
		// 		}),
		// 	});

		// 	const tsconfig = getTsconfig(fixture.path);
		// 	expect(tsconfig).not.toBeNull();

		// 	const matcher = createPathsMatcher(tsconfig!)!;
		// 	expect(tsconfig).not.toBeNull();

		// 	const resolvedAttempts = await getTscResolution('#imports', fixture.path);
		// 	expect(matcher('#imports')).toStrictEqual([
		// 		resolvedAttempts[0].filePath.slice(0, -3),
		// 	]);

		// 	await fixture.rm();
		// });
	});
});
