import { testSuite, expect } from 'manten';
import { getTsconfig } from '../../dist/index.js';
import { createFixture, tsconfigJson } from '../utils/create-fixture';
import { getTscConfig } from '../utils/get-tsc-tsconfig';

export default testSuite(({ describe }) => {
	describe('extends', ({ describe, test }) => {
		describe('error handling', ({ test }) => {
			test('invalid path', async () => {
				const fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': tsconfigJson({
						extends: './non-existent.json',
					}),
				});

				expect(() => getTsconfig(fixture.path)).toThrow('File \'./non-existent.json\' not found.');

				await fixture.cleanup();
			});

			test('invalid json', async () => {
				const fixture = await createFixture({
					'file.ts': '',
					'tsconfig.empty.json': 'require("fs")',
					'tsconfig.json': tsconfigJson({
						extends: './tsconfig.empty.json',
					}),
				});

				expect(() => getTsconfig(fixture.path)).toThrow('Failed to parse JSON');

				await fixture.cleanup();
			});
		});

		describe('resolves', ({ test }) => {
			test('handles missing extends', async () => {
				const fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': tsconfigJson({
						extends: 'missing-package',
					}),
				});

				expect(() => getTsconfig(fixture.path)).toThrow('File \'missing-package\' not found.');

				await fixture.cleanup();
			});

			test('no extension', async () => {
				const fixture = await createFixture({
					asdf: tsconfigJson({
						compilerOptions: {
							jsx: 'react',
							allowJs: true,
						},
					}),
					'tsconfig.json': tsconfigJson({
						extends: './asdf',
						compilerOptions: {
							strict: true,
						},
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);

				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('parent directory', async () => {
				const fixture = await createFixture({
					'tsconfig.json': tsconfigJson({
						compilerOptions: {
							jsx: 'react',
							allowJs: true,
						},
					}),
					tests: {
						'tsconfig.json': tsconfigJson({
							extends: '..',
							compilerOptions: {
								strict: true,
							},
						}),
						'file.ts': '',
					},
				});

				const testDirectory = `${fixture.path}/tests/`;
				const expectedTsconfig = await getTscConfig(testDirectory);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(testDirectory);

				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('shoud not resolve directory', async () => {
				const fixture = await createFixture({
					'tsconfig.json': tsconfigJson({
						extends: './directory/',
					}),
					'director/tsconfig.json': tsconfigJson({
						compilerOptions: {
							jsx: 'react',
						},
					}),
				});

				expect(
					() => getTsconfig(fixture.path),
				).toThrow('File \'./directory/\' not found.');

				await fixture.cleanup();
			});

			test('extends dependency package', async () => {
				const fixture = await createFixture({
					'node_modules/dep/tsconfig.json': tsconfigJson({
						compilerOptions: {
							strict: true,
							jsx: 'react',
						},
					}),
					'tsconfig.json': tsconfigJson({
						extends: 'dep',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('extends dependency package with path', async () => {
				const fixture = await createFixture({
					'node_modules/dep/tsconfig.json': tsconfigJson({
						compilerOptions: {
							strict: true,
							jsx: 'react',
						},
					}),
					'tsconfig.json': tsconfigJson({
						extends: 'dep/tsconfig.json',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('extends dependency package far', async () => {
				const fixture = await createFixture({
					'node_modules/dep/tsconfig.json': tsconfigJson({
						compilerOptions: {
							strict: true,
							jsx: 'react',
						},
					}),
					'nested/nested/nested': {
						'tsconfig.json': tsconfigJson({
							extends: 'dep/tsconfig.json',
						}),
						'file.ts': '',
					},
				});

				const fixturePath = `${fixture.path}/nested/nested/nested`;
				const expectedTsconfig = await getTscConfig(fixturePath);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixturePath);
				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('extends dependency package with index.js', async () => {
				const fixture = await createFixture({
					'node_modules/dep': {
						'package.json': '{"main": "./index.js"}',
						'index.js': 'require("fs")',
						'tsconfig.json': tsconfigJson({
							compilerOptions: {
								strict: true,
								jsx: 'react',
							},
						}),
					},
					'tsconfig.json': tsconfigJson({
						extends: 'dep',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('extends dependency package with invalid package.json', async () => {
				const fixture = await createFixture({
					'node_modules/dep': {
						'package.json': 'invalid json',
						'some-config.json': tsconfigJson({
							compilerOptions: {
								strict: true,
								jsx: 'react',
							},
						}),
						'tsconfig.json': tsconfigJson({
							compilerOptions: {
								jsx: 'preserve',
							},
						}),
					},
					'tsconfig.json': tsconfigJson({
						extends: 'dep',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('extends dependency package with package.json#tsconfig', async () => {
				const fixture = await createFixture({
					'node_modules/dep': {
						'package.json': '{"tsconfig": "./some-config.json"}',
						'some-config.json': tsconfigJson({
							compilerOptions: {
								strict: true,
								jsx: 'react',
							},
						}),
						// should be ignored
						'tsconfig.json': tsconfigJson({
							compilerOptions: {
								jsx: 'preserve',
							},
						}),
					},
					'tsconfig.json': tsconfigJson({
						extends: 'dep',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('extends dependency package with path', async () => {
				const fixture = await createFixture({
					'node_modules/dep/some-directory': {
						'package.json': '{"tsconfig": "./some-config.json"}',
						'some-config.json': tsconfigJson({
							compilerOptions: {
								strict: true,
								jsx: 'react',
							},
						}),
						// should be ignored
						'tsconfig.json': tsconfigJson({
							compilerOptions: {
								jsx: 'preserve',
							},
						}),
					},
					'tsconfig.json': tsconfigJson({
						extends: 'dep/some-directory',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});
		});

		test('empty file', async () => {
			const fixture = await createFixture({
				'file.ts': '',
				'tsconfig.empty.json': '',
				'tsconfig.json': tsconfigJson({
					extends: './tsconfig.empty.json',
				}),
			});

			const expectedTsconfig = await getTscConfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

			await fixture.cleanup();
		});

		test('empty json', async () => {
			const fixture = await createFixture({
				'file.ts': '',
				'tsconfig.empty.json': tsconfigJson({}),
				'tsconfig.json': tsconfigJson({
					extends: './tsconfig.empty.json',
				}),
			});

			const expectedTsconfig = await getTscConfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

			await fixture.cleanup();
		});

		test('references is ignored', async () => {
			const fixture = await createFixture({
				'tsconfig.base.json': tsconfigJson({
					compilerOptions: {
						strict: true,
						jsx: 'react',
					},
					references: [
						{
							path: 'src',
						},
					],
				}),
				'tsconfig.json': tsconfigJson({
					extends: './tsconfig.base.json',
				}),
				'file.ts': '',
			});

			const expectedTsconfig = await getTscConfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = getTsconfig(fixture.path);

			expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

			await fixture.cleanup();
		});

		describe('files', ({ test }) => {
			test('inherits with relative path', async () => {
				const fixture = await createFixture({
					'some-dir': {
						src: {
							'a.ts': '',
							'b.ts': '',
						},
						'tsconfig.base.json': tsconfigJson({
							files: [
								'src/a.ts',
							],
						}),
					},
					'tsconfig.json': tsconfigJson({
						extends: './some-dir/tsconfig.base.json',
					}),
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				const tsconfig = getTsconfig(fixture.path);

				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('gets overwritten', async () => {
				const fixture = await createFixture({
					'some-dir': {
						src: {
							'a.ts': '',
							'b.ts': '',
						},
						'tsconfig.base.json': tsconfigJson({
							files: [
								'src/a.ts',
							],
						}),
					},
					'tsconfig.json': tsconfigJson({
						extends: './some-dir/tsconfig.base.json',
						files: [
							'src/b.ts',
						],
					}),
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				const tsconfig = getTsconfig(fixture.path);

				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});
		});

		describe('include', ({ test }) => {
			test('inherits with relative path', async () => {
				const fixture = await createFixture({
					'src-a': {
						'a.ts': '',
						'b.ts': '',
						'c.ts': '',
						'tsconfig.base.json': tsconfigJson({
							include: ['*'],
						}),
					},
					'tsconfig.json': tsconfigJson({
						extends: './src-a/tsconfig.base.json',
					}),
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);

				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('gets overwritten', async () => {
				const fixture = await createFixture({
					'src-a': {
						'a.ts': '',
						'b.ts': '',
						'c.ts': '',
					},
					'src-b': {
						'a.ts': '',
						'b.ts': '',
						'c.ts': '',
					},
					'tsconfig.base.json': tsconfigJson({
						include: ['src-a'],
					}),
					'tsconfig.json': tsconfigJson({
						extends: './tsconfig.base.json',
						include: ['src-b'],
					}),
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);

				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});
		});

		describe('baseUrl', ({ test }) => {
			test('path becomes prefixed with ./', async () => {
				const fixture = await createFixture({
					'src-a': {
						'a.ts': '',
						'b.ts': '',
						'c.ts': '',
					},
					'tsconfig.json': tsconfigJson({
						compilerOptions: {
							baseUrl: 'src-a',
						},
					}),
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);

				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('gets inherited with relative path', async () => {
				const fixture = await createFixture({
					project: {
						'src-a': {
							'a.ts': '',
							'b.ts': '',
							'c.ts': '',
						},
						'tsconfig.json': tsconfigJson({
							compilerOptions: {
								baseUrl: 'src-a',
							},
						}),
					},
					'tsconfig.json': tsconfigJson({
						extends: './project/tsconfig.json',
					}),
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});
		});

		test('nested extends', async () => {
			const fixture = await createFixture({
				'file.ts': '',
				'some-dir/some-dir/b': tsconfigJson({
					extends: '../../c.json',
					compilerOptions: {
						module: 'commonjs',
					},
				}),
				'c.json': tsconfigJson({
					compileOnSave: true,
				}),
				'tsconfig.a.json': tsconfigJson({
					extends: './some-dir/some-dir/b',
					compilerOptions: {
						allowJs: true,
					},
				}),
				'tsconfig.json': tsconfigJson({
					extends: './tsconfig.a.json',
				}),
			});

			const expectedTsconfig = await getTscConfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = getTsconfig(fixture.path);

			expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

			await fixture.cleanup();
		});

		test('watchOptions', async () => {
			const fixture = await createFixture({
				'file.ts': '',
				'tsconfig.base.json': tsconfigJson({
					watchOptions: {
						synchronousWatchDirectory: true,
						excludeDirectories: ['a', 'b'],
					},
				}),
				'tsconfig.json': tsconfigJson({
					extends: './tsconfig.base.json',
					watchOptions: {
						fallbackPolling: 'fixedinterval',
						excludeDirectories: ['c'],
					},
				}),
			});

			const expectedTsconfig = await getTscConfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = getTsconfig(fixture.path);
			expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

			await fixture.cleanup();
		});
	});
});
