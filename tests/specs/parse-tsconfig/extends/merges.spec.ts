import fs from 'fs/promises';
import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfigJson, getTscTsconfig } from '../../../utils.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('merges', ({ describe, test }) => {
		describe('error handling', ({ test }) => {
			test('invalid path', async () => {
				await using fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': createTsconfigJson({
						extends: './non-existent.json',
					}),
				});

				expect(
					() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
				).toThrow('File \'./non-existent.json\' not found.');
			});

			test('invalid json', async () => {
				await using fixture = await createFixture({
					'file.ts': '',
					'tsconfig.empty.json': 'require("fs")',
					'tsconfig.json': createTsconfigJson({
						extends: './tsconfig.empty.json',
					}),
				});

				expect(
					() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
				).toThrow('Failed to parse tsconfig at:');
			});
		});

		test('empty file', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.empty.json': '',
				'tsconfig.json': createTsconfigJson({
					extends: './tsconfig.empty.json',
				}),
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});

		test('empty json', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.empty.json': createTsconfigJson({}),
				'tsconfig.json': createTsconfigJson({
					extends: './tsconfig.empty.json',
				}),
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});

		test('jsonc', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.base.json': `{
					// comment
					"compilerOptions": {
						"jsx": "react", // dangling comma
					},
				}`,
				'tsconfig.json': createTsconfigJson({
					extends: './tsconfig.base.json',
				}),
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});

		test('references is ignored', async () => {
			await using fixture = await createFixture({
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

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});

		describe('files', ({ test }) => {
			test('inherits with relative path', async () => {
				await using fixture = await createFixture({
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('gets overwritten', async () => {
				await using fixture = await createFixture({
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});
		});

		describe('include', ({ test }) => {
			test('inherits with relative path', async () => {
				await using fixture = await createFixture({
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('gets overwritten', async () => {
				await using fixture = await createFixture({
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('inherits from symlinked configs', async () => {
				await using fixture = await createFixture({
					'symlink-source': {
						'tsconfig.base.json': createTsconfigJson({
							include: ['../src/*'],
						}),
					},
					project: {
						src: {
							'a.ts': '',
							'b.ts': '',
							'c.ts': '',
						},
						'tsconfig.json': createTsconfigJson({
							extends: './symlink/tsconfig.base.json',
						}),
					},
				});

				await fs.symlink(fixture.getPath('symlink-source'), fixture.getPath('project/symlink'));

				const expectedTsconfig = await getTscTsconfig(path.join(fixture.path, 'project'));
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'project', 'tsconfig.json'));

				expect({
					...tsconfig,
					// See https://github.com/privatenumber/get-tsconfig/issues/73
					include: tsconfig.include?.map(includePath => `symlink/../${includePath}`),
				}).toStrictEqual(expectedTsconfig);
			});
		});

		describe('baseUrl', ({ test }) => {
			test('path becomes prefixed with ./', async () => {
				await using fixture = await createFixture({
					'src-a': {
						'a.ts': '',
					},
					'tsconfig.json': createTsconfigJson({
						compilerOptions: {
							baseUrl: 'src-a',
						},
					}),
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('gets inherited with relative path', async () => {
				await using fixture = await createFixture({
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('resolves parent baseUrl path', async () => {
				await using fixture = await createFixture({
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

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('resolves parent baseUrl & paths', async () => {
				await using fixture = await createFixture({
					'project/tsconfig.json': createTsconfigJson({
						compilerOptions: {
							baseUrl: '.',
							paths: {
								'@/*': ['src/*'],
							},
						},
					}),
					'tsconfig.json': createTsconfigJson({
						extends: './project/tsconfig.json',
					}),
					'a.ts': '',
				});

				const expectedTsconfig = await getTscTsconfig(fixture.path);
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});

			test('resolves parent baseUrl path defined in symlinked config', async () => {
				await using fixture = await createFixture({
					'symlink-source': {
						'tsconfig.json': createTsconfigJson({
							compilerOptions: {
								baseUrl: '..',
							},
						}),
					},
					project: {
						'tsconfig.json': createTsconfigJson({
							extends: './symlink/tsconfig.json',
						}),
						'a.ts': '',
					},
				});

				await fs.symlink(fixture.getPath('symlink-source'), fixture.getPath('project/symlink'));

				const expectedTsconfig = await getTscTsconfig(path.join(fixture.path, 'project'));
				delete expectedTsconfig.files;

				const tsconfig = parseTsconfig(path.join(fixture.path, 'project', 'tsconfig.json'));
				expect(tsconfig).toStrictEqual(expectedTsconfig);
			});
		});

		test('nested extends', async () => {
			await using fixture = await createFixture({
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

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));

			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});

		test('extends array', async () => {
			await using fixture = await createFixture({
				'file.ts': '',
				'tsconfig.a.json': createTsconfigJson({
					compilerOptions: {
						allowJs: true,
						strict: true,
						jsx: 'react',
					},
				}),
				'tsconfig.b.json': createTsconfigJson({
					compilerOptions: {
						jsx: 'react-jsx',
					},
				}),
				'tsconfig.json': createTsconfigJson({
					extends: ['./tsconfig.a.json', './tsconfig.b.json'],
					compilerOptions: {
						allowJs: false,
					},
				}),
			});

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});

		test('watchOptions', async () => {
			await using fixture = await createFixture({
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

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});
	});
});
