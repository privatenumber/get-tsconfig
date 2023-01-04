import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { tsconfigJsonString, getTscTsconfig } from '../../../utils.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('extends', ({ describe, test }) => {
		describe('error handling', ({ test }) => {
			test('invalid path', async () => {
				const fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': tsconfigJsonString({
						extends: './non-existent.json',
					}),
				});

				expect(
					() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
				).toThrow('File \'./non-existent.json\' not found.');

				await fixture.rm();
			});

			test('invalid json', async () => {
				const fixture = await createFixture({
					'file.ts': '',
					'tsconfig.empty.json': 'require("fs")',
					'tsconfig.json': tsconfigJsonString({
						extends: './tsconfig.empty.json',
					}),
				});

				expect(
					() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
				).toThrow('Failed to parse tsconfig at:');

				await fixture.rm();
			});
		});

		describe('resolves', ({ test }) => {
			test('handles missing extends', async () => {
				const fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': tsconfigJsonString({
						extends: 'missing-package',
					}),
				});

				expect(
					() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
				).toThrow('File \'missing-package\' not found.');

				await fixture.rm();
			});

			test('no extension', async () => {
				const fixture = await createFixture({
					asdf: tsconfigJsonString({
						compilerOptions: {
							jsx: 'react',
							allowJs: true,
						},
					}),
					'tsconfig.json': tsconfigJsonString({
						extends: './asdf',
						compilerOptions: {
							strict: true,
						},
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('absolute path', async () => {
				const fixture = await createFixture({
					'dep/tsconfig.json': tsconfigJsonString({
						compilerOptions: {
							strict: true,
							jsx: 'react',
						},
					}),
					'file.ts': '',
				});
				await fixture.writeFile('tsconfig.json', tsconfigJsonString({
					extends: path.join(fixture.path, 'dep/tsconfig.json'),
				}));

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('absolute path without extension', async () => {
				const fixture = await createFixture({
					'dep/tsconfig.json': tsconfigJsonString({
						compilerOptions: {
							strict: true,
							jsx: 'react',
						},
					}),
					'file.ts': '',
				});
				await fixture.writeFile('tsconfig.json', tsconfigJsonString({
					extends: path.join(fixture.path, 'dep/tsconfig'),
				}));

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('parent directory', async () => {
				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString({
						compilerOptions: {
							jsx: 'react',
							allowJs: true,
						},
					}),
					tests: {
						'tsconfig.json': tsconfigJsonString({
							extends: '..',
							compilerOptions: {
								strict: true,
							},
						}),
						'file.ts': '',
					},
				});

				const testDirectory = `${fixture.path}/tests/`;
				const expectedTsconfig = await getTscTsconfig(testDirectory);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(testDirectory, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('shoud not resolve directory', async () => {
				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString({
						extends: './directory/',
					}),
					'director/tsconfig.json': tsconfigJsonString({
						compilerOptions: {
							jsx: 'react',
						},
					}),
				});

				expect(
					() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
				).toThrow('File \'./directory/\' not found.');

				await fixture.rm();
			});

			test('extends dependency package', async () => {
				const fixture = await createFixture({
					'node_modules/dep/tsconfig.json': tsconfigJsonString({
						compilerOptions: {
							strict: true,
							jsx: 'react',
						},
					}),
					'tsconfig.json': tsconfigJsonString({
						extends: 'dep',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('extends dependency package with path', async () => {
				const fixture = await createFixture({
					'node_modules/dep/tsconfig.json': tsconfigJsonString({
						compilerOptions: {
							strict: true,
							jsx: 'react',
						},
					}),
					'tsconfig.json': tsconfigJsonString({
						extends: 'dep/tsconfig.json',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('extends dependency package far', async () => {
				const fixture = await createFixture({
					'node_modules/dep/tsconfig.json': tsconfigJsonString({
						compilerOptions: {
							strict: true,
							jsx: 'react',
						},
					}),
					'nested/nested/nested': {
						'tsconfig.json': tsconfigJsonString({
							extends: 'dep/tsconfig.json',
						}),
						'file.ts': '',
					},
				});

				const fixturePath = `${fixture.path}/nested/nested/nested`;
				const expectedTsconfig = await getTscTsconfig(fixturePath);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixturePath, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('extends dependency package with index.js', async () => {
				const fixture = await createFixture({
					'node_modules/dep': {
						'package.json': '{"main": "./index.js"}',
						'index.js': 'require("fs")',
						'tsconfig.json': tsconfigJsonString({
							compilerOptions: {
								strict: true,
								jsx: 'react',
							},
						}),
					},
					'tsconfig.json': tsconfigJsonString({
						extends: 'dep',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('extends dependency package with path name w/o .json extension', async () => {
				const fixture = await createFixture({
					'node_modules/dep': {
						'react-native.json': tsconfigJsonString({
							compilerOptions: {
								strict: true,
								jsx: 'react-native',
							},
						}),
					},
					'tsconfig.json': tsconfigJsonString({
						extends: 'dep/react-native',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('extends dependency package file should not resolve extensionless file', async () => {
				const fixture = await createFixture({
					'node_modules/dep': {
						'react-native': tsconfigJsonString({
							compilerOptions: {
								strict: true,
								jsx: 'react-native',
							},
						}),
					},
					'tsconfig.json': tsconfigJsonString({
						extends: 'dep/react-native',
					}),
					'file.ts': '',
				});

				expect(() => parseTsconfig(path.join(fixture.path, 'tsconfig.json'))).toThrow('File \'dep/react-native\' not found');

				await fixture.rm();
			});

			test('extends dependency package with invalid package.json', async () => {
				const fixture = await createFixture({
					'node_modules/dep': {
						'package.json': 'invalid json',
						'some-config.json': tsconfigJsonString({
							compilerOptions: {
								strict: true,
								jsx: 'react',
							},
						}),
						'tsconfig.json': tsconfigJsonString({
							compilerOptions: {
								jsx: 'preserve',
							},
						}),
					},
					'tsconfig.json': tsconfigJsonString({
						extends: 'dep',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('extends dependency package with package.json#tsconfig', async () => {
				const fixture = await createFixture({
					'node_modules/dep': {
						'package.json': '{"tsconfig": "./some-config.json"}',
						'some-config.json': tsconfigJsonString({
							compilerOptions: {
								strict: true,
								jsx: 'react',
							},
						}),
						// should be ignored
						'tsconfig.json': tsconfigJsonString({
							compilerOptions: {
								jsx: 'preserve',
							},
						}),
					},
					'tsconfig.json': tsconfigJsonString({
						extends: 'dep',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('extends dependency package with path', async () => {
				const fixture = await createFixture({
					'node_modules/dep/some-directory': {
						'package.json': '{"tsconfig": "./some-config.json"}',
						'some-config.json': tsconfigJsonString({
							compilerOptions: {
								strict: true,
								jsx: 'react',
							},
						}),
						// should be ignored
						'tsconfig.json': tsconfigJsonString({
							compilerOptions: {
								jsx: 'preserve',
							},
						}),
					},
					'tsconfig.json': tsconfigJsonString({
						extends: 'dep/some-directory',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('extends dependency with colliding directory name', async () => {
				const fixture = await createFixture({
					'node_modules/config-package/lib/overlapping-directory': '',
					'node_modules/config-package/lib.json': tsconfigJsonString({
						compilerOptions: {
							jsx: 'react-jsx',
						},
					}),
					'tsconfig.json': tsconfigJsonString({
						extends: 'config-package/lib',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});
		});

		test('empty file', async () => {
			const fixture = await createFixture({
				'file.ts': '',
				'tsconfig.empty.json': '',
				'tsconfig.json': tsconfigJsonString({
					extends: './tsconfig.empty.json',
				}),
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('empty json', async () => {
			const fixture = await createFixture({
				'file.ts': '',
				'tsconfig.empty.json': tsconfigJsonString({}),
				'tsconfig.json': tsconfigJsonString({
					extends: './tsconfig.empty.json',
				}),
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('jsonc', async () => {
			const fixture = await createFixture({
				'file.ts': '',
				'tsconfig.base.json': `{
					// comment
					"compilerOptions": {
						"jsx": "react", // dangling comma
					},
				}`,
				'tsconfig.json': tsconfigJsonString({
					extends: './tsconfig.base.json',
				}),
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('references is ignored', async () => {
			const fixture = await createFixture({
				'tsconfig.base.json': tsconfigJsonString({
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
				'tsconfig.json': tsconfigJsonString({
					extends: './tsconfig.base.json',
				}),
				'file.ts': '',
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		describe('files', ({ test }) => {
			test('inherits with relative path', async () => {
				const fixture = await createFixture({
					'some-dir': {
						src: {
							'a.ts': '',
							'b.ts': '',
						},
						'tsconfig.base.json': tsconfigJsonString({
							files: [
								'src/a.ts',
							],
						}),
					},
					'tsconfig.json': tsconfigJsonString({
						extends: './some-dir/tsconfig.base.json',
					}),
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('gets overwritten', async () => {
				const fixture = await createFixture({
					'some-dir': {
						src: {
							'a.ts': '',
							'b.ts': '',
						},
						'tsconfig.base.json': tsconfigJsonString({
							files: [
								'src/a.ts',
							],
						}),
					},
					'tsconfig.json': tsconfigJsonString({
						extends: './some-dir/tsconfig.base.json',
						files: [
							'src/b.ts',
						],
					}),
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});
		});

		describe('include', ({ test }) => {
			test('inherits with relative path', async () => {
				const fixture = await createFixture({
					'src-a': {
						'a.ts': '',
						'b.ts': '',
						'c.ts': '',
						'tsconfig.base.json': tsconfigJsonString({
							include: ['*'],
						}),
					},
					'tsconfig.json': tsconfigJsonString({
						extends: './src-a/tsconfig.base.json',
					}),
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
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
					'tsconfig.base.json': tsconfigJsonString({
						include: ['src-a'],
					}),
					'tsconfig.json': tsconfigJsonString({
						extends: './tsconfig.base.json',
						include: ['src-b'],
					}),
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});
		});

		describe('baseUrl', ({ test }) => {
			test('path becomes prefixed with ./', async () => {
				const fixture = await createFixture({
					'src-a': {
						'a.ts': '',
					},
					'tsconfig.json': tsconfigJsonString({
						compilerOptions: {
							baseUrl: 'src-a',
						},
					}),
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('gets inherited with relative path', async () => {
				const fixture = await createFixture({
					project: {
						'src-a': {
							'a.ts': '',
						},
						'tsconfig.json': tsconfigJsonString({
							compilerOptions: {
								baseUrl: 'src-a',
							},
						}),
					},
					'tsconfig.json': tsconfigJsonString({
						extends: './project/tsconfig.json',
					}),
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});

			test('resolves parent baseUrl path', async () => {
				const fixture = await createFixture({
					'project/tsconfig.json': tsconfigJsonString({
						compilerOptions: {
							baseUrl: '..',
						},
					}),
					'tsconfig.json': tsconfigJsonString({
						extends: './project/tsconfig.json',
					}),
					'a.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);

				await fixture.rm();
			});
		});

		test('nested extends', async () => {
			const fixture = await createFixture({
				'file.ts': '',
				'some-dir/some-dir/b': tsconfigJsonString({
					extends: '../../c.json',
					compilerOptions: {
						module: 'commonjs',
					},
				}),
				'c.json': tsconfigJsonString({
					compileOnSave: true,
				}),
				'tsconfig.a.json': tsconfigJsonString({
					extends: './some-dir/some-dir/b',
					compilerOptions: {
						allowJs: true,
					},
				}),
				'tsconfig.json': tsconfigJsonString({
					extends: './tsconfig.a.json',
				}),
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('watchOptions', async () => {
			const fixture = await createFixture({
				'file.ts': '',
				'tsconfig.base.json': tsconfigJsonString({
					watchOptions: {
						synchronousWatchDirectory: true,
						excludeDirectories: ['a', 'b'],
					},
				}),
				'tsconfig.json': tsconfigJsonString({
					extends: './tsconfig.base.json',
					watchOptions: {
						fallbackPolling: 'fixedinterval',
						excludeDirectories: ['c'],
					},
				}),
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});
	});
});
