import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { execaNode } from 'execa';
import { tsconfigJsonString, getTscTsconfig } from '../../../utils.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
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
	});
});
