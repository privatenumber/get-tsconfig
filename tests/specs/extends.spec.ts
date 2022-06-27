import { testSuite, expect } from 'manten';
import { getTsconfig } from '../../dist/index.js';
import { createFixture, createTsconfigJson } from '../utils/create-fixture';
import { getTscConfig } from '../utils/tsc';

export default testSuite(({ describe }) => {
	describe('extends', ({ describe, test }) => {
		describe('error handling', ({ test }) => {
			test('invalid path', async () => {
				const fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': createTsconfigJson({
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
					'tsconfig.json': createTsconfigJson({
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
					'tsconfig.json': createTsconfigJson({
						extends: 'missing-package',
					}),
				});

				expect(() => getTsconfig(fixture.path)).toThrow('File \'missing-package\' not found.');

				await fixture.cleanup();
			});

			test('no extension', async () => {
				const fixture = await createFixture({
					asdf: createTsconfigJson({
						compilerOptions: {
							jsx: 'react',
							allowJs: true,
						},
					}),
					'tsconfig.json': createTsconfigJson({
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
					'tsconfig.json': createTsconfigJson({
						compilerOptions: {
							jsx: 'react',
							allowJs: true,
						},
					}),
					tests: {
						'tsconfig.json': createTsconfigJson({
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
					'tsconfig.json': createTsconfigJson({
						extends: './directory/',
					}),
					'director/tsconfig.json': createTsconfigJson({
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
					'node_modules/dep/tsconfig.json': createTsconfigJson({
						compilerOptions: {
							strict: true,
							jsx: 'react',
						},
					}),
					'tsconfig.json': createTsconfigJson({
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
					'node_modules/dep/tsconfig.json': createTsconfigJson({
						compilerOptions: {
							strict: true,
							jsx: 'react',
						},
					}),
					'tsconfig.json': createTsconfigJson({
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
					'node_modules/dep/tsconfig.json': createTsconfigJson({
						compilerOptions: {
							strict: true,
							jsx: 'react',
						},
					}),
					'nested/nested/nested': {
						'tsconfig.json': createTsconfigJson({
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
						'tsconfig.json': createTsconfigJson({
							compilerOptions: {
								strict: true,
								jsx: 'react',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
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

			test('extends dependency package with path name w/o .json extension', async () => {
				const fixture = await createFixture({
					'node_modules/dep': {
						'react-native.json': createTsconfigJson({
							compilerOptions: {
								strict: true,
								jsx: 'react-native',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
						extends: 'dep/react-native',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('extends dependency package file should not resolve extensionless file', async () => {
				const fixture = await createFixture({
					'node_modules/dep': {
						'react-native': createTsconfigJson({
							compilerOptions: {
								strict: true,
								jsx: 'react-native',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
						extends: 'dep/react-native',
					}),
					'file.ts': '',
				});

				expect(() => getTsconfig(fixture.path)).toThrow('File \'dep/react-native\' not found');

				await fixture.cleanup();
			});

			test('extends dependency package with invalid package.json', async () => {
				const fixture = await createFixture({
					'node_modules/dep': {
						'package.json': 'invalid json',
						'some-config.json': createTsconfigJson({
							compilerOptions: {
								strict: true,
								jsx: 'react',
							},
						}),
						'tsconfig.json': createTsconfigJson({
							compilerOptions: {
								jsx: 'preserve',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
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
						'some-config.json': createTsconfigJson({
							compilerOptions: {
								strict: true,
								jsx: 'react',
							},
						}),
						// should be ignored
						'tsconfig.json': createTsconfigJson({
							compilerOptions: {
								jsx: 'preserve',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
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
						'some-config.json': createTsconfigJson({
							compilerOptions: {
								strict: true,
								jsx: 'react',
							},
						}),
						// should be ignored
						'tsconfig.json': createTsconfigJson({
							compilerOptions: {
								jsx: 'preserve',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
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

			test('extends dependency with colliding directory name', async () => {
				const fixture = await createFixture({
					'node_modules/config-package/lib/overlapping-directory': '',
					'node_modules/config-package/lib.json': createTsconfigJson({
						compilerOptions: {
							jsx: 'react-jsx',
						},
					}),
					'tsconfig.json': createTsconfigJson({
						extends: 'config-package/lib',
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
				'tsconfig.json': createTsconfigJson({
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
				'tsconfig.empty.json': createTsconfigJson({}),
				'tsconfig.json': createTsconfigJson({
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
				'tsconfig.base.json': createTsconfigJson({
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
				'tsconfig.json': createTsconfigJson({
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
						'tsconfig.base.json': createTsconfigJson({
							files: [
								'src/a.ts',
							],
						}),
					},
					'tsconfig.json': createTsconfigJson({
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
						'tsconfig.base.json': createTsconfigJson({
							files: [
								'src/a.ts',
							],
						}),
					},
					'tsconfig.json': createTsconfigJson({
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
						'tsconfig.base.json': createTsconfigJson({
							include: ['*'],
						}),
					},
					'tsconfig.json': createTsconfigJson({
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
					'tsconfig.base.json': createTsconfigJson({
						include: ['src-a'],
					}),
					'tsconfig.json': createTsconfigJson({
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
					},
					'tsconfig.json': createTsconfigJson({
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
						},
						'tsconfig.json': createTsconfigJson({
							compilerOptions: {
								baseUrl: 'src-a',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
						extends: './project/tsconfig.json',
					}),
				});

				const expectedTsconfig = await getTscConfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = getTsconfig(fixture.path);
				expect(tsconfig!.config).toStrictEqual(expectedTsconfig);

				await fixture.cleanup();
			});

			test('resolves parent baseUrl path', async () => {
				const fixture = await createFixture({
					'project/tsconfig.json': createTsconfigJson({
						compilerOptions: {
							baseUrl: '..',
						},
					}),
					'tsconfig.json': createTsconfigJson({
						extends: './project/tsconfig.json',
					}),
					'a.ts': '',
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
				'some-dir/some-dir/b': createTsconfigJson({
					extends: '../../c.json',
					compilerOptions: {
						module: 'commonjs',
					},
				}),
				'c.json': createTsconfigJson({
					compileOnSave: true,
				}),
				'tsconfig.a.json': createTsconfigJson({
					extends: './some-dir/some-dir/b',
					compilerOptions: {
						allowJs: true,
					},
				}),
				'tsconfig.json': createTsconfigJson({
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
				'tsconfig.base.json': createTsconfigJson({
					watchOptions: {
						synchronousWatchDirectory: true,
						excludeDirectories: ['a', 'b'],
					},
				}),
				'tsconfig.json': createTsconfigJson({
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
