import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { execaNode } from 'execa';
import { createTsconfigJson, getTscTsconfig, createPackageJson } from '../../../../utils.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('node_modules', ({ describe, test }) => {
		test('prefers file over package', async () => {
			await using fixture = await createFixture({
				node_modules: {
					'dep.json': createTsconfigJson({
						compilerOptions: {
							jsx: 'react-native',
						},
					}),
					'dep/tsconfig.json': createTsconfigJson({
						compilerOptions: {
							jsx: 'react',
						},
					}),
				},
				'tsconfig.json': createTsconfigJson({
					extends: 'dep',
				}),
				'file.ts': '',
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});

		describe('extends dependency', ({ test }) => {
			test('implicit tsconfig.json', async () => {
				await using fixture = await createFixture({
					'node_modules/dep': {
						'package.json': createPackageJson({
							main: './index.js',
						}),
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('without package.json', async () => {
				await using fixture = await createFixture({
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('ignores invalid package.json', async () => {
				await using fixture = await createFixture({
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('ignores invalid package.json', async () => {
				await using fixture = await createFixture({
					'node_modules/dep': {
						'package.json': 'invalid json',
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('empty package.json', async () => {
				await using fixture = await createFixture({
					'node_modules/dep': {
						'package.json': '',
						'custom.json': createTsconfigJson({
							compilerOptions: {
								module: 'node16',
							},
						}),
						'tsconfig.json': createTsconfigJson({
							compilerOptions: {
								module: 'commonjs',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
						extends: 'dep/custom.json',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('empty object package.json', async () => {
				await using fixture = await createFixture({
					'node_modules/dep': {
						'package.json': '{}',
						'custom.json': createTsconfigJson({
							compilerOptions: {
								module: 'node16',
							},
						}),
						'tsconfig.json': createTsconfigJson({
							compilerOptions: {
								module: 'commonjs',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
						extends: 'dep/custom.json',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});
		});

		describe('dependency file', ({ test }) => {
			test('direct tsconfig.json', async () => {
				await using fixture = await createFixture({
					'node_modules/dep/some-file.json': createTsconfigJson({
						compilerOptions: {
							strict: true,
							jsx: 'react',
						},
					}),
					'tsconfig.json': createTsconfigJson({
						extends: 'dep/some-file.json',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('implicit .json extension', async () => {
				await using fixture = await createFixture({
					'node_modules/dep/react-native.json': createTsconfigJson({
						compilerOptions: {
							strict: true,
							jsx: 'react-native',
						},
					}),
					'tsconfig.json': createTsconfigJson({
						extends: 'dep/react-native',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('prefers implicit .json over directory', async () => {
				await using fixture = await createFixture({
					'node_modules/config-package/lib/tsconfig.json': createTsconfigJson({
						compilerOptions: {
							jsx: 'react-jsxdev',
						},
					}),
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('extensionless file should not work', async () => {
				await using fixture = await createFixture({
					'node_modules/dep/tsconfig': createTsconfigJson({
						compilerOptions: {
							strict: true,
							jsx: 'react-native',
						},
					}),
					'tsconfig.json': createTsconfigJson({
						extends: 'dep/tsconfig',
					}),
					'file.ts': '',
				});

				const errorMessage = 'File \'dep/tsconfig\' not found';
				await expect(
					getTscTsconfig(fixture.path),
				).rejects.toThrow(errorMessage);
				expect(() => parseTsconfig(fixture.getPath('tsconfig.json'))).toThrow(errorMessage);
			});

			test('arbitrary extension should not work', async () => {
				await using fixture = await createFixture({
					'node_modules/dep/tsconfig.ts': createTsconfigJson({
						compilerOptions: {
							strict: true,
							jsx: 'react-native',
						},
					}),
					'tsconfig.json': createTsconfigJson({
						extends: 'dep/tsconfig.ts',
					}),
					'file.ts': '',
				});

				const errorMessage = 'File \'dep/tsconfig.ts\' not found';
				await expect(
					getTscTsconfig(fixture.path),
				).rejects.toThrow(errorMessage);
				expect(() => parseTsconfig(fixture.getPath('tsconfig.json'))).toThrow(errorMessage);
			});
		});

		test('directory named "tsconfig.json"', async () => {
			await using fixture = await createFixture({
				'node_modules/dep/tsconfig.json/tsconfig.json': createTsconfigJson({
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

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});

		test('extends dependency package far', async () => {
			await using fixture = await createFixture({
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

			const fixturePath = fixture.getPath('nested/nested/nested');
			const expectedTsconfig = await getTscTsconfig(fixturePath);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixturePath, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});

		// https://github.com/privatenumber/get-tsconfig/issues/76
		test('resolves config in parent node_modules', async () => {
			await using fixture = await createFixture({
				library: {
					src: {
						'a.ts': '',
						'b.ts': '',
						'c.ts': '',
					},
					'tsconfig.json': createTsconfigJson({
						extends: '@monorepo/tsconfig/tsconfig.base.json',
						include: ['src'],
					}),
				},

				'node_modules/@monorepo/tsconfig': {
					'tsconfig.base.json': createTsconfigJson({
						compilerOptions: {
							module: 'commonjs',
						},
					}),
				},
			});

			const originalCwd = process.cwd();
			try {
				process.chdir(fixture.getPath('library'));
				const expectedTsconfig = await getTscTsconfig('.');
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig('./tsconfig.json');

				expect(tsconfig).toStrictEqual(expectedTsconfig);
			} finally {
				process.chdir(originalCwd);
			}
		});

		describe('package.json#tsconfig', ({ test }) => {
			test('package.json#tsconfig', async () => {
				await using fixture = await createFixture({
					'node_modules/dep': {
						'package.json': createPackageJson({
							tsconfig: './some-config.json',
						}),
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('reads nested package.json#tsconfig', async () => {
				await using fixture = await createFixture({
					'node_modules/dep/some-directory': {
						'package.json': createPackageJson({
							// This is ignored because its not at root
							exports: {
								'./*': null,
							},
							tsconfig: './some-config.json',
						}),
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});
		});

		// TODO: test pnp package exports
		test('yarn pnp', async () => {
			const { stdout } = await execaNode('./index.js', [], {
				nodeOptions: ['--require', './.pnp.cjs'],
				cwd: './tests/fixtures/yarn-pnp',
				reject: false,
			});

			expect(stdout).toBe([
				'{ compilerOptions: { strict: true, jsx: \'react\' } }',
				'{ compilerOptions: { strict: true, jsx: \'react\' } }',
				'{ compilerOptions: { strict: true, jsx: \'react\' } }',
				'{ compilerOptions: { strict: true, jsx: \'react\' } }',
				'Error: File \'non-existent-package\' not found.',
				'Error: File \'fs/promises\' not found.',
			].join('\n'));
		});

		describe('package.json exports', ({ test, describe }) => {
			test('main', async () => {
				await using fixture = await createFixture({
					'node_modules/dep': {
						'package.json': createPackageJson({
							exports: './some-config.json',
						}),
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('subpath', async () => {
				await using fixture = await createFixture({
					'node_modules/dep': {
						'package.json': createPackageJson({
							exports: { './config': './some-config.json' },
						}),
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
						extends: 'dep/config',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			describe('conditions', ({ test }) => {
				test('require', async () => {
					await using fixture = await createFixture({
						'node_modules/dep': {
							'package.json': createPackageJson({
								exports: {
									require: './some-config.json',
								},
							}),
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

					const expectedTsconfig = await getTscTsconfig(fixture.path);
					delete expectedTsconfig.files;

					const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
					expect(tsconfig).toStrictEqual(expectedTsconfig);
				});

				test('types', async () => {
					await using fixture = await createFixture({
						'node_modules/dep': {
							'package.json': createPackageJson({
								exports: {
									types: './some-config.json',
								},
							}),
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

					const expectedTsconfig = await getTscTsconfig(fixture.path);
					delete expectedTsconfig.files;

					const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
					expect(tsconfig).toStrictEqual(expectedTsconfig);
				});

				test('missing condition should fail', async () => {
					await using fixture = await createFixture({
						'node_modules/dep': {
							'package.json': createPackageJson({
								exports: {
									asdf: './some-config.json',
								},
							}),
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

					const errorMessage = 'File \'dep\' not found.';
					await expect(
						getTscTsconfig(fixture.path),
					).rejects.toThrow(errorMessage);
					expect(
						() => parseTsconfig(fixture.getPath('tsconfig.json')),
					).toThrow(errorMessage);
				});
			});

			test('missing subpath should fail', async () => {
				await using fixture = await createFixture({
					'node_modules/dep': {
						'package.json': createPackageJson({
							exports: {
								'./config': './some-config.json',
							},
						}),
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
						extends: 'dep/missing',
					}),
					'file.ts': '',
				});

				const errorMessage = 'File \'dep/missing\' not found.';
				await expect(
					getTscTsconfig(fixture.path),
				).rejects.toThrow(errorMessage);
				expect(
					() => parseTsconfig(fixture.getPath('tsconfig.json')),
				).toThrow(errorMessage);
			});

			// Seems like a TypeScript bug
			test('null exports should resolve tsconfig.json', async () => {
				await using fixture = await createFixture({
					'node_modules/dep': {
						'package.json': createPackageJson({
							exports: null,
						}),

						'tsconfig.json': createTsconfigJson({
							compilerOptions: {
								jsx: 'react-native',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
						extends: 'dep',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('null exports should resolve tsconfig.json in directory', async () => {
				await using fixture = await createFixture({
					'node_modules/dep': {
						'package.json': createPackageJson({
							exports: null,
						}),

						'some-directory/tsconfig.json': createTsconfigJson({
							compilerOptions: {
								jsx: 'react-jsx',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
						extends: 'dep/some-directory',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('path block should not resolve tsconfig.json', async () => {
				await using fixture = await createFixture({
					'node_modules/dep': {
						'package.json': createPackageJson({
							exports: {
								'./*': null,
							},
						}),

						'tsconfig.json': createTsconfigJson({
							compilerOptions: {
								jsx: 'react-native',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
						extends: 'dep',
					}),
					'file.ts': '',
				});

				const errorMessage = 'File \'dep\' not found.';
				await expect(
					getTscTsconfig(fixture.path),
				).rejects.toThrow(errorMessage);
				expect(
					() => parseTsconfig(fixture.getPath('tsconfig.json')),
				).toThrow(errorMessage);
			});

			test('package.json ignored in nested directory', async () => {
				await using fixture = await createFixture({
					'node_modules/dep/a': {
						'package.json': createPackageJson({
							exports: {
								'./*': null,
							},
						}),
						'tsconfig.json': createTsconfigJson({
							compilerOptions: {
								jsx: 'react-native',
							},
						}),
					},
					'tsconfig.json': createTsconfigJson({
						extends: 'dep/a',
					}),
					'file.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(fixture.getPath('tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});
		});
	});
});
