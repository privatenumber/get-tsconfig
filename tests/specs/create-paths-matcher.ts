import { testSuite, expect } from 'manten';
import { createFixture, tsconfigJson } from '../utils/create-fixture';
import { getTscResolution } from '../utils/tsc';
import { getTsconfig, createPathsMatcher } from '#get-tsconfig'; // eslint-disable-line import/no-unresolved

/**
 * Resolution is tested against the TypeScript compiler using:
 * npx tsc --traceResolution --noEmit
 */

export default testSuite(({ describe }) => {
	describe('paths', ({ describe, test }) => {
		describe('error cases', ({ test }) => {
			test('no baseUrl or paths', async () => {
				const fixture = await createFixture({
					'tsconfig.json': tsconfigJson({
						compilerOptions: {},
					}),
				});

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig).not.toBeNull();
				expect(createPathsMatcher(tsconfig!)).toBeNull();

				await fixture.cleanup();
			});

			test('no baseUrl & non-relative paths', async () => {
				const fixture = await createFixture({
					'tsconfig.json': tsconfigJson({
						compilerOptions: {
							paths: {
								'@': ['src'],
							},
						},
					}),
				});

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig).not.toBeNull();
				expect(() => createPathsMatcher(tsconfig!)).toThrow('Non-relative paths are not allowed when \'baseUrl\' is not set. Did you forget a leading \'./\'?');

				await fixture.cleanup();
			});

			test('multiple * in pattern', async () => {
				const fixture = await createFixture({
					'tsconfig.json': tsconfigJson({
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

				await fixture.cleanup();
			});

			test('multiple * in substitution', async () => {
				const fixture = await createFixture({
					'tsconfig.json': tsconfigJson({
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

				await fixture.cleanup();
			});

			test('no match', async () => {
				const fixture = await createFixture({
					'tsconfig.json': tsconfigJson({
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

				await fixture.cleanup();
			});
		});

		test('baseUrl', async () => {
			const fixture = await createFixture({
				'tsconfig.json': tsconfigJson({
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

			await fixture.cleanup();
		});

		test('baseUrl from extends', async () => {
			const fixture = await createFixture({
				'src/lib/file': '',
				'some-dir/tsconfig.json': tsconfigJson({
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
				'tsconfig.json': tsconfigJson({
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

			await fixture.cleanup();
		});

		test('exact match', async () => {
			const fixture = await createFixture({
				'tsconfig.json': tsconfigJson({
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

			await fixture.cleanup();
		});

		// #17
		test('exact match with parent path', async () => {
			const fixture = await createFixture({
				'tsconfig.json': tsconfigJson({
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

			await fixture.cleanup();
		});

		test('exact match with literal wildcard', async () => {
			const fixture = await createFixture({
				'b/file': '',
				'tsconfig.json': tsconfigJson({
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

			await fixture.cleanup();
		});

		test('prefix match', async () => {
			const fixture = await createFixture({
				'prefixed/specifier': '',
				'tsconfig.json': tsconfigJson({
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

			await fixture.cleanup();
		});

		test('suffix match', async () => {
			const fixture = await createFixture({
				'suffixed/specifier': '',
				'tsconfig.json': tsconfigJson({
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

			await fixture.cleanup();
		});

		test('doesnt match current directory', async () => {
			const fixture = await createFixture({
				'tsconfig.json': tsconfigJson({
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

			await fixture.cleanup();
		});

		test('doesnt match parent directory', async () => {
			const fixture = await createFixture({
				'tsconfig.json': tsconfigJson({
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

			await fixture.cleanup();
		});

		test('doesnt match relative paths', async () => {
			const fixture = await createFixture({
				'tsconfig.json': tsconfigJson({
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

			await fixture.cleanup();
		});

		test('matches absolute paths', async () => {
			const fixture = await createFixture({
				'tsconfig.json': tsconfigJson({
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

			await fixture.cleanup();
		});

		test('matches path that starts with .', async () => {
			const fixture = await createFixture({
				'tsconfig.json': tsconfigJson({
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

			await fixture.cleanup();
		});
	});
});
