import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfigJson, getTscTsconfig } from '../../../utils.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('merges', ({ describe, test }) => {
		describe('error handling', ({ test }) => {
			test('invalid path', async () => {
				const fixture = await createFixture({
					'file.ts': '',
					'tsconfig.json': createTsconfigJson({
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
					'tsconfig.json': createTsconfigJson({
						extends: './tsconfig.empty.json',
					}),
				});

				expect(
					() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
				).toThrow('Failed to parse tsconfig at:');

				await fixture.rm();
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

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});

		test('empty json', async () => {
			const fixture = await createFixture({
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
				'tsconfig.json': createTsconfigJson({
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

				await fixture.rm();
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

				await fixture.rm();
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

				await fixture.rm();
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

			await fixture.rm();
		});

		test('extends array', async () => {
			const fixture = await createFixture({
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

			const expectedTsconfig = await getTscTsconfig(fixture.path);
			delete expectedTsconfig.files;

			const tsconfig = parseTsconfig(path.join(fixture.path, 'tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);

			await fixture.rm();
		});
	});
});
