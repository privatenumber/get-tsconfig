import path from 'node:path';
import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { readTsconfig } from '#get-tsconfig';
import { createTsconfigJson, createPackageJson } from '../../utils/fixture-helpers.ts';
import { getTscTsconfig } from '../../utils/typescript-helpers.ts';

describe('node_modules', () => {
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

		const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));
		expect(tsconfig).toStrictEqual(expectedTsconfig);
	});

	describe('extends dependency', () => {
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

			const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

			expect(expectedTsconfig).toStrictEqual(tsconfig);
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

			const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

			expect(expectedTsconfig).toStrictEqual(tsconfig);
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

			const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));
			expect(tsconfig).toStrictEqual(expectedTsconfig);
		});

		test('ignores invalid package.json without extra configs', async () => {
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

			const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));
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

			const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

			expect(expectedTsconfig).toStrictEqual(tsconfig);
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

			const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

			expect(expectedTsconfig).toStrictEqual(tsconfig);
		});
	});

	describe('dependency file', () => {
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

			const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

			expect(expectedTsconfig).toStrictEqual(tsconfig);
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

			const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

			expect(expectedTsconfig).toStrictEqual(tsconfig);
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

			const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));
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
			expect(() => readTsconfig(fixture.getPath('tsconfig.json'))).toThrow(errorMessage);
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
			expect(() => readTsconfig(fixture.getPath('tsconfig.json'))).toThrow(errorMessage);
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

		const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

		expect(expectedTsconfig).toStrictEqual(tsconfig);
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

		const { config: tsconfig } = readTsconfig(path.join(fixturePath, 'tsconfig.json'));

		expect(expectedTsconfig).toStrictEqual(tsconfig);
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

			const { config: tsconfig } = readTsconfig('./tsconfig.json');

			expect(tsconfig).toStrictEqual(expectedTsconfig);
		} finally {
			process.chdir(originalCwd);
		}
	});

	import('./package-exports.spec.ts');
	import('./package-tsconfig.spec.ts');
	import('./node-path.spec.ts');
	import('./yarn-pnp.spec.ts');
});
