import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { readTsconfig } from '#get-tsconfig';
import { createTsconfigJson, createPackageJson } from '../../utils/fixture-helpers.ts';
import { getTscTsconfig } from '../../utils/typescript-helpers.ts';

describe('package.json exports', () => {
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

		const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

		expect(expectedTsconfig).toStrictEqual(tsconfig);
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

		const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

		expect(expectedTsconfig).toStrictEqual(tsconfig);
	});

	describe('conditions', () => {
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

			const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

			expect(expectedTsconfig).toStrictEqual(tsconfig);
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

			const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

			expect(expectedTsconfig).toStrictEqual(tsconfig);
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
				() => readTsconfig(fixture.getPath('tsconfig.json')),
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
			() => readTsconfig(fixture.getPath('tsconfig.json')),
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

		const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));
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

		const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));
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
			() => readTsconfig(fixture.getPath('tsconfig.json')),
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

		const { config: tsconfig } = readTsconfig(fixture.getPath('tsconfig.json'));

		expect(expectedTsconfig).toStrictEqual(tsconfig);
	});
});
