import path from 'node:path';
import { describe, test, expect } from 'manten';
import slash from 'slash';
import { createFixture } from 'fs-fixture';
import typescript from 'typescript';
import { isFsCaseSensitive } from 'is-fs-case-sensitive';
import { createTsconfigJson } from '../utils/fixture-helpers.js';
import {
	isFileIncluded,
	readTsconfig,
	type TsConfigResult,
	type TsConfigJsonResolved,
} from '#get-tsconfig';

const fsCaseSensitive = isFsCaseSensitive();

const isWindows = process.platform === 'win32';

const assertFilesMatch = (
	tsconfig: TsConfigResult,
	files: string[],
) => {
	for (const file of files) {
		expect(isFileIncluded(tsconfig, file)).toBe(true);

		if (isWindows) {
			expect(isFileIncluded(tsconfig, file.replaceAll('/', '\\'))).toBe(true);
		}
	}
};

const fileNames = Object.freeze([
	'ts.ts',
	'tsx.tsx',
	'dts.d.ts',
	'mts.mts',
	'dmts.d.mts',
	'cts.cts',
	'dcts.d.cts',
]);

const testFiles = Object.fromEntries(
	fileNames.map(fileName => [fileName, '']),
);

const {
	sys: tsSys,
	readConfigFile,
	parseJsonConfigFileContent,
} = typescript;

const getTscMatchingFiles = (
	tsconfigPath: string,
) => {
	const tsconfigDirectoryPath = path.dirname(tsconfigPath);

	// Read tsconfig.json file
	const tsconfig = readConfigFile(tsconfigPath, tsSys.readFile);

	if (tsconfig.error) {
		throw new Error(tsconfig.error.messageText as string);
	}

	// Resolve extends
	const parsedTsconfig = parseJsonConfigFileContent(
		tsconfig.config,
		tsSys,
		tsconfigDirectoryPath,
	);

	return parsedTsconfig.fileNames.sort();
};

describe('isFileIncluded', () => {
	describe('error handling', () => {
		test('should return false for non-absolute paths', async () => {
			const tsconfig: TsConfigJsonResolved = {};
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				'index.ts': '',
			});

			const matchConfig = {
				config: tsconfig,
				path: fixture.getPath('tsconfig.json'),
			};

			// Relative path
			expect(isFileIncluded(matchConfig, 'index.ts')).toBe(false);

			// Bare specifier
			expect(isFileIncluded(matchConfig, 'react')).toBe(false);
		});

		test('should not match path outside of directory', async () => {
			const tsconfig: TsConfigJsonResolved = {};

			const tsconfigSubpath = 'some-dir/tsconfig.json';
			await using fixture = await createFixture({
				[tsconfigSubpath]: createTsconfigJson(tsconfig),
				'index.ts': '',
			});

			const tsconfigPath = fixture.getPath(tsconfigSubpath);
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles.length).toBe(0);

			const matchConfig = {
				config: tsconfig,
				path: tsconfigPath,
			};

			expect(isFileIncluded(matchConfig, '/index.ts')).toBe(false);
		});
	});

	describe('files', () => {
		test('disables default include', async () => {
			const tsconfig: TsConfigJsonResolved = {
				files: ['index.ts'],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				'index.ts': '',
				'no-match.ts': '',
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);

			expect(tsFiles).toStrictEqual([
				slash(fixture.getPath('index.ts')),
			]);

			const matchConfig = {
				config: tsconfig,
				path: tsconfigPath,
			};

			assertFilesMatch(matchConfig, tsFiles);
			expect(isFileIncluded(matchConfig, fixture.getPath('no-match.ts'))).toBe(false);
		});

		test('files outside of project', async () => {
			const tsconfig: TsConfigJsonResolved = {
				files: ['../index.ts'],
			};

			await using fixture = await createFixture({
				'project/tsconfig.json': createTsconfigJson(tsconfig),
				'index.ts': '',
			});

			const tsconfigPath = fixture.getPath('project/tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles).toStrictEqual([
				slash(fixture.getPath('index.ts')),
			]);

			assertFilesMatch({
				config: tsconfig,
				path: tsconfigPath,
			}, tsFiles);
		});

		test('files takes precedence over extensions', async () => {
			const tsconfig: TsConfigJsonResolved = {
				files: ['some-dir/index.js'],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				'some-dir/index.js': '',
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles).toStrictEqual([
				slash(fixture.getPath('some-dir/index.js')),
			]);

			assertFilesMatch({
				config: tsconfig,
				path: tsconfigPath,
			}, tsFiles);
		});

		test('files takes precedence over exclude', async () => {
			const tsconfig: TsConfigJsonResolved = {
				files: ['some-dir/index.ts'],
				exclude: ['some-dir/index.ts'],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				'some-dir/index.ts': '',
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles).toStrictEqual([
				slash(fixture.getPath('some-dir/index.ts')),
			]);

			assertFilesMatch({
				config: tsconfig,
				path: tsconfigPath,
			}, tsFiles);
		});
	});

	describe('include', () => {
		test('default include matches all TS files', async () => {
			const tsconfig: TsConfigJsonResolved = {};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				'some-directory': testFiles,
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);

			assertFilesMatch({
				config: tsconfig,
				path: tsconfigPath,
			}, tsFiles);
		});

		test('specific directories', async () => {
			const periodInPath = 'period.in.path/directory';
			const tsconfig: TsConfigJsonResolved = {
				include: [
					'directory',
					'ends-with-slash/',
					periodInPath,
					'non-existent',
				],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				directory: testFiles,
				'ends-with-slash': testFiles,
				[periodInPath]: testFiles,
				'no-match': testFiles,
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles.length).toBe(21);

			assertFilesMatch({
				config: tsconfig,
				path: tsconfigPath,
			}, tsFiles);
		});

		test('include matches nested directories', async () => {
			const tsconfig: TsConfigJsonResolved = {
				include: ['dir-a'],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				'dir-a/dir-b/dir-c': testFiles,
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);

			assertFilesMatch({
				config: tsconfig,
				path: tsconfigPath,
			}, tsFiles);
		});

		test('should not match directory with prefix', async () => {
			const tsconfig: TsConfigJsonResolved = {
				include: ['dir-a'],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				'dir-abc': testFiles,
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles.length).toBe(0);

			const matchConfig = {
				config: tsconfig,
				path: tsconfigPath,
			};

			expect(isFileIncluded(matchConfig, fixture.getPath('dir-abc/ts.ts'))).toBe(false);
		});

		test('relative parent directory', async () => {
			const tsconfig: TsConfigJsonResolved = {
				include: ['../src'],
			};

			await using fixture = await createFixture({
				'src/a.ts': '',
				'project/tsconfig.json': createTsconfigJson(tsconfig),
			});

			const tsconfigPath = fixture.getPath('project/tsconfig.json');

			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles).toStrictEqual([
				slash(fixture.getPath('src/a.ts')),
			]);

			assertFilesMatch({
				config: tsconfig,
				path: tsconfigPath,
			}, tsFiles);
		});

		describe('hidden files', () => {
			test('should not match hidden files by default', async () => {
				const directoryName = 'some-dir';
				const tsconfig: TsConfigJsonResolved = {};

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[directoryName]: Object.fromEntries(
						fileNames.map(fileName => [`.${fileName}`, '']),
					),
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matchConfig = {
					config: tsconfig,
					path: tsconfigPath,
				};
				expect(isFileIncluded(matchConfig, path.join(fixture.path, directoryName, '.index.ts'))).toBe(false);
			});

			test('should not match hidden directory by default', async () => {
				const directoryName = '.hidden-dir';
				const tsconfig: TsConfigJsonResolved = {};

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[directoryName]: testFiles,
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matchConfig = {
					config: tsconfig,
					path: tsconfigPath,
				};
				expect(isFileIncluded(matchConfig, path.join(fixture.path, directoryName, 'index.ts'))).toBe(false);
			});

			test('explicit directory name without star should not match', async () => {
				const directoryName = '.hidden-dir';

				const tsconfig: TsConfigJsonResolved = {
					include: [directoryName],
				};

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[directoryName]: testFiles,
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matchConfig = {
					config: tsconfig,
					path: tsconfigPath,
				};
				expect(isFileIncluded(matchConfig, path.join(fixture.path, directoryName, 'index.ts'))).toBe(false);
			});

			test('explicit directory name with star should match', async () => {
				const directoryName = '.hidden-dir';

				const tsconfig: TsConfigJsonResolved = {
					include: [`${directoryName}/*`],
				};

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[directoryName]: testFiles,
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(7);

				assertFilesMatch({
					config: tsconfig,
					path: tsconfigPath,
				}, tsFiles);
			});

			test('explicit hidden glob should match hidden directory', async () => {
				const directoryName = '.hidden-dir';

				const tsconfig: TsConfigJsonResolved = {
					include: ['.*/*'],
				};

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[directoryName]: testFiles,
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(7);

				assertFilesMatch({
					config: tsconfig,
					path: tsconfigPath,
				}, tsFiles);
			});

			test('explicit hidden glob should match hidden files', async () => {
				const directoryName = 'some-dir';

				const tsconfig: TsConfigJsonResolved = {
					include: ['**/.*'],
				};

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[directoryName]: Object.fromEntries(
						fileNames.map(fileName => [`.${fileName}`, '']),
					),
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(7);

				assertFilesMatch({
					config: tsconfig,
					path: tsconfigPath,
				}, tsFiles);
			});
		});

		for (const directory of ['node_modules', 'bower_components', 'jspm_packages']) {
			describe(directory, () => {
				test('exclude by default', async () => {
					const directoryName = `${directory}/some-pkg`;
					const tsconfig: TsConfigJsonResolved = {};

					await using fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						[directoryName]: testFiles,
					});

					const tsconfigPath = fixture.getPath('tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(0);

					const matchConfig = {
						config: tsconfig,
						path: tsconfigPath,
					};
					expect(isFileIncluded(matchConfig, path.join(fixture.path, directoryName, 'index.ts'))).toBe(false);
				});

				test('explictly include', async () => {
					const tsconfig: TsConfigJsonResolved = {
						include: [directory],
					};

					await using fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						[`${directory}/some-pkg`]: testFiles,
					});

					const tsconfigPath = fixture.getPath('tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(7);

					assertFilesMatch({
						config: tsconfig,
						path: tsconfigPath,
					}, tsFiles);
				});

				test(`project in ${directory}`, async () => {
					const tsconfig: TsConfigJsonResolved = {};

					await using fixture = await createFixture({
						[directory]: {
							'tsconfig.json': createTsconfigJson(tsconfig),
							'some-dir': testFiles,
						},
					});

					const tsconfigPath = path.join(fixture.path, directory, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(7);

					assertFilesMatch({
						config: tsconfig,
						path: tsconfigPath,
					}, tsFiles);
				});
			});
		}

		describe('case sensitivity', () => {
			test('default', async () => {
				const projectDirectory = '/project-root';
				const matchConfig = {
					config: {
						include: ['SOME-DIR'],
					},
					path: path.join(projectDirectory, 'tsconfig.json'),
				};

				expect(isFileIncluded(matchConfig, path.join(projectDirectory, 'SOME-DIR/INDEX.ts'))).toBe(true);

				if (fsCaseSensitive) {
					expect(isFileIncluded(matchConfig, path.join(projectDirectory, 'some-dir/index.ts'))).toBe(false);
				} else {
					expect(isFileIncluded(matchConfig, path.join(projectDirectory, 'some-dir/index.ts'))).toBe(true);
				}
			});

			test('case sensitive', async () => {
				const projectDirectory = '/project-root';
				const matchConfig = {
					config: {
						include: ['SOME-DIR'],
					},
					path: path.join(projectDirectory, 'tsconfig.json'),
				};

				// Exact case always matches
				expect(isFileIncluded(matchConfig, path.join(projectDirectory, 'SOME-DIR/index.ts'))).toBe(true);

				// Different case depends on filesystem
				if (fsCaseSensitive) {
					expect(isFileIncluded(matchConfig, path.join(projectDirectory, 'some-dir/index.ts'))).toBe(false);
				} else {
					expect(isFileIncluded(matchConfig, path.join(projectDirectory, 'some-dir/index.ts'))).toBe(true);
				}
			});
		});

		describe('globs', () => {
			test('?', async () => {
				const tsconfig: TsConfigJsonResolved = {
					include: [
						'some-dir/?.ts',
						'some-dir/?b??ts',
					],
				};

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'some-dir': {
						'a.ts': '',
						'abc.ts': '',
						'nested-dir': {
							'd.ts': '',
						},
					},
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(2);

				const matchConfig = {
					config: tsconfig,
					path: tsconfigPath,
				};

				assertFilesMatch(matchConfig, tsFiles);
				expect(isFileIncluded(matchConfig, fixture.getPath('some-dir/nested-dir/d.ts'))).toBe(false);
			});

			describe('*', () => {
				test('single', async () => {
					const tsconfig: TsConfigJsonResolved = {
						include: ['*'],
					};

					await using fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						'a.ts': '',
					});

					const tsconfigPath = fixture.getPath('tsconfig.json');

					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles).toStrictEqual([
						slash(fixture.getPath('a.ts')),
					]);

					assertFilesMatch({
						config: tsconfig,
						path: tsconfigPath,
					}, tsFiles);
				});

				test('multiple', async () => {
					const tsconfig: TsConfigJsonResolved = {
						include: [
							'some-dir/*b*',
							'some-dir/dot*ts',
						],
					};

					await using fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						'some-dir': {
							'a.ts': '',
							'aaabccc.ts': '',
							'dot.ts': '',
							'nested-dir': {
								'd.ts': '',
							},
						},
					});

					const tsconfigPath = fixture.getPath('tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles).toStrictEqual([
						fixture.getPath('some-dir/aaabccc.ts'),
						fixture.getPath('some-dir/dot.ts'),
					].map(slash));

					const matchConfig = {
						config: tsconfig,
						path: tsconfigPath,
					};

					assertFilesMatch(matchConfig, tsFiles);
					expect(isFileIncluded(matchConfig, fixture.getPath('some-dir/nested-dir/d.ts'))).toBe(false);
				});
			});

			test('**/', async () => {
				const tsconfig: TsConfigJsonResolved = {
					include: ['some-dir/**/*'],
				};

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'some-dir': {
						'a.ts': '',
						'bc.ts': '',
						'nested-dir': {
							'd.ts': '',
						},
					},
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([
					fixture.getPath('some-dir/a.ts'),
					fixture.getPath('some-dir/bc.ts'),
					fixture.getPath('some-dir/nested-dir/d.ts'),
				].map(slash));

				assertFilesMatch({
					config: tsconfig,
					path: tsconfigPath,
				}, tsFiles);
			});
		});
	});

	describe('.min.js', () => {
		const filePath = 'some-dir/index.min.js';

		test('explicit files', async () => {
			const tsconfig: TsConfigJsonResolved = {
				compilerOptions: {
					allowJs: true,
				},
				files: [filePath],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				[filePath]: '',
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles).toStrictEqual([
				slash(path.join(fixture.path, filePath)),
			]);

			assertFilesMatch({
				config: tsconfig,
				path: tsconfigPath,
			}, tsFiles);
		});

		test('explicit include', async () => {
			const tsconfig: TsConfigJsonResolved = {
				compilerOptions: {
					allowJs: true,
				},
				include: [filePath],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				[filePath]: '',
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles).toStrictEqual([
				slash(path.join(fixture.path, filePath)),
			]);

			assertFilesMatch({
				config: tsconfig,
				path: tsconfigPath,
			}, tsFiles);
		});

		test('empty exclude', async () => {
			const tsconfig: TsConfigJsonResolved = {
				compilerOptions: {
					allowJs: true,
				},
				exclude: [],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				[filePath]: '',
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles.length).toBe(0);

			const matchConfig = {
				config: tsconfig,
				path: tsconfigPath,
			};

			expect(isFileIncluded(matchConfig, path.join(fixture.path, filePath))).toBe(false);
		});

		test('empty exclude with directory include', async () => {
			const tsconfig: TsConfigJsonResolved = {
				compilerOptions: {
					allowJs: true,
				},
				include: ['some-dir'],
				exclude: [],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				[filePath]: '',
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles.length).toBe(0);

			const matchConfig = {
				config: tsconfig,
				path: tsconfigPath,
			};

			expect(isFileIncluded(matchConfig, path.join(fixture.path, filePath))).toBe(false);
		});
	});

	describe('exclude', () => {
		describe('default: outDir & declarationDir', () => {
			const directoryNames = ['out-dir', 'declaration-dir'];

			const directoryFileNames = directoryNames.flatMap(
				directoryName => fileNames.map(fileName => `${directoryName}/${fileName}`),
			);

			const directories = Object.freeze(
				Object.fromEntries(directoryFileNames.map(
					filePath => [filePath, ''],
				)),
			);

			test('exclude by default', async () => {
				const tsconfig: TsConfigJsonResolved = {
					compilerOptions: {
						outDir: 'out-dir',
						declarationDir: 'declaration-dir',
					},
				};

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					...directories,
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matchConfig = {
					config: tsconfig,
					path: tsconfigPath,
				};

				for (const filePath of directoryFileNames) {
					const absoluteFilePath = path.join(fixture.path, filePath);
					expect(isFileIncluded(matchConfig, absoluteFilePath)).toBe(false);
				}
			});

			test('overwritable', async () => {
				const tsconfig: TsConfigJsonResolved = {
					compilerOptions: {
						outDir: 'out-dir',
						declarationDir: 'declaration-dir',
					},
					exclude: [],
				};

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					...directories,
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);

				expect(tsFiles).toStrictEqual(
					directoryFileNames.map(filePath => slash(path.join(fixture.path, filePath))).sort(),
				);

				const matchConfig = {
					config: tsconfig,
					path: tsconfigPath,
				};

				for (const filePath of directoryFileNames) {
					const absoluteFilePath = path.join(fixture.path, filePath);
					expect(isFileIncluded(matchConfig, absoluteFilePath)).toBe(true);
				}
			});
		});

		test('exclude takes precedence over include', async () => {
			const tsconfig: TsConfigJsonResolved = {
				include: ['some-dir'],
				exclude: ['some-dir'],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				'some-dir/index.ts': '',
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles.length).toBe(0);

			const matchConfig = {
				config: tsconfig,
				path: tsconfigPath,
			};

			expect(isFileIncluded(matchConfig, fixture.getPath('some-dir/index.ts'))).toBe(false);
		});

		test('should not ignore directory with prefix', async () => {
			const tsconfig: TsConfigJsonResolved = {
				exclude: ['dir-prefix'],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				'dir-prefixabc': testFiles,
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles.length).toBe(7);

			assertFilesMatch({
				config: tsconfig,
				path: tsconfigPath,
			}, tsFiles);
		});

		describe('case sensitivity', () => {
			test('default', async () => {
				const projectDirectory = '/project-root';
				const matchConfig = {
					config: {
						exclude: ['SOME-DIR'],
					},
					path: path.join(projectDirectory, 'tsconfig.json'),
				};

				expect(isFileIncluded(matchConfig, path.join(projectDirectory, 'SOME-DIR/INDEX.ts'))).toBe(false);

				if (fsCaseSensitive) {
					expect(isFileIncluded(matchConfig, path.join(projectDirectory, 'some-dir/index.ts'))).toBe(true);
				} else {
					expect(isFileIncluded(matchConfig, path.join(projectDirectory, 'some-dir/index.ts'))).toBe(false);
				}
			});

			test('case sensitive', async () => {
				const projectDirectory = '/project-root';
				const matchConfig = {
					config: {
						exclude: ['SOME-DIR'],
					},
					path: path.join(projectDirectory, 'tsconfig.json'),
				};

				// Exact case excluded
				expect(isFileIncluded(matchConfig, path.join(projectDirectory, 'SOME-DIR/index.ts'))).toBe(false);

				// Different case depends on filesystem
				if (fsCaseSensitive) {
					expect(isFileIncluded(matchConfig, path.join(projectDirectory, 'some-dir/index.ts'))).toBe(true);
				} else {
					expect(isFileIncluded(matchConfig, path.join(projectDirectory, 'some-dir/index.ts'))).toBe(false);
				}
			});
		});

		describe('globs', () => {
			test('?', async () => {
				const tsconfig: TsConfigJsonResolved = {
					exclude: [
						'some-dir/?.ts',
						'some-dir/?b??ts',
					],
				};

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'some-dir': {
						'a.ts': '',
						'abc.ts': '',
						'nested-dir': {
							'd.ts': '',
						},
					},
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);

				expect(tsFiles).toStrictEqual([
					slash(fixture.getPath('some-dir/nested-dir/d.ts')),
				]);

				const matchConfig = {
					config: tsconfig,
					path: tsconfigPath,
				};

				expect(isFileIncluded(matchConfig, fixture.getPath('some-dir/a.ts'))).toBe(false);
				expect(isFileIncluded(matchConfig, fixture.getPath('some-dir/abc.ts'))).toBe(false);

				assertFilesMatch(matchConfig, tsFiles);
			});

			test('*', async () => {
				const tsconfig: TsConfigJsonResolved = {
					exclude: [
						'some-dir/*b*',
						'some-dir/q*eee*t*',
					],
				};

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'some-dir': {
						'a.ts': '',
						'abc.ts': '',
						'qwwweeerrrt.ts': '',
						'nested-dir': {
							'd.ts': '',
						},
					},
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([
					fixture.getPath('some-dir/a.ts'),
					fixture.getPath('some-dir/nested-dir/d.ts'),
				].map(slash));

				const matchConfig = {
					config: tsconfig,
					path: tsconfigPath,
				};

				assertFilesMatch(matchConfig, tsFiles);
				expect(isFileIncluded(matchConfig, fixture.getPath('some-dir/abc.ts'))).toBe(false);
				expect(isFileIncluded(matchConfig, fixture.getPath('some-dir/qwwweeerrrt.ts'))).toBe(false);
			});

			test('**/', async () => {
				const tsconfig: TsConfigJsonResolved = {
					exclude: ['some-dir/**/*'],
				};

				const files = [
					'a.ts',
					'some-dir/b.ts',
					'some-dir/nested-dir/c.ts',
				];

				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					...Object.fromEntries(
						files.map(fileName => [fileName, '']),
					),
				});

				const tsconfigPath = fixture.getPath('tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([
					slash(path.join(fixture.path, files[0])),
				]);

				const matchConfig = {
					config: tsconfig,
					path: tsconfigPath,
				};

				expect(isFileIncluded(matchConfig, path.join(fixture.path, files[0]))).toBe(true);
				expect(isFileIncluded(matchConfig, path.join(fixture.path, files[1]))).toBe(false);
				expect(isFileIncluded(matchConfig, path.join(fixture.path, files[2]))).toBe(false);
			});
		});
	});

	describe('.js', () => {
		test('should not match', async () => {
			const tsconfig: TsConfigJsonResolved = {};

			const jsFilePath = 'index.js';
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				[jsFilePath]: '',
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');

			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles.length).toBe(0);

			const matchConfig = {
				config: tsconfig,
				path: tsconfigPath,
			};
			expect(isFileIncluded(matchConfig, path.join(fixture.path, jsFilePath))).toBe(false);
		});

		test('should match with allowJs', async () => {
			const tsconfig: TsConfigJsonResolved = {
				compilerOptions: {
					allowJs: true,
				},
			};

			const jsFilePath = 'index.js';
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				[jsFilePath]: '',
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);

			expect(tsFiles).toStrictEqual([
				slash(path.join(fixture.path, jsFilePath)),
			]);

			assertFilesMatch({
				config: tsconfig,
				path: tsconfigPath,
			}, tsFiles);
		});

		test('shouldnt match .js even if explicitly in "includes"', async () => {
			const filePath = 'file.js';
			const tsconfig: TsConfigJsonResolved = {
				include: [filePath],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				[filePath]: '',
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles.length).toBe(0);

			const matchConfig = {
				config: tsconfig,
				path: tsconfigPath,
			};
			expect(isFileIncluded(matchConfig, path.join(fixture.path, filePath))).toBe(false);
		});

		test('matches .js if explicitly in "files"', async () => {
			const filePath = 'file.js';
			const tsconfig: TsConfigJsonResolved = {
				files: [filePath],
			};

			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson(tsconfig),
				[filePath]: '',
			});

			const tsconfigPath = fixture.getPath('tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);

			// Matches but errors: Did you mean to enable the 'allowJs' option?
			expect(tsFiles).toStrictEqual([
				slash(path.join(fixture.path, filePath)),
			]);

			assertFilesMatch({
				config: tsconfig,
				path: tsconfigPath,
			}, tsFiles);
		});
	});

	describe('extends', () => {
		test('must be resolved', async () => {
			expect(
				() => isFileIncluded({
					config: {
						// @ts-expect-error extends must be pre-resolved
						extends: '../tsconfig.json',
					},
					path: '',
				}, '/file.ts'),
			).toThrow('tsconfig#extends must be resolved. Use getTsconfig or readTsconfig to resolve it.');
		});

		test('should match', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({
					compilerOptions: {
						allowJs: true,
					},
				}),
				'a.js': '',
				project: {
					'tsconfig.json': createTsconfigJson({
						extends: '../tsconfig.json',
					}),
					'b.js': '',
				},
			});

			const tsconfigPath = fixture.getPath('project/tsconfig.json');

			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles).toStrictEqual([
				slash(fixture.getPath('project/b.js')),
			]);

			const tsconfig = readTsconfig(tsconfigPath);

			assertFilesMatch(tsconfig, tsFiles);
		});
	});

	describe('${configDir}', () => {
		test('matches files when include uses ${configDir}', async () => {
			await using fixture = await createFixture({
				'tsconfig.base.json': createTsconfigJson({
					include: ['${configDir}/src'],
				}),
				project: {
					'tsconfig.json': createTsconfigJson({
						extends: '../tsconfig.base.json',
					}),
					'src/index.ts': '',
				},
			});

			const tsconfigPath = fixture.getPath('project/tsconfig.json');
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles.length).toBe(1);

			const tsconfig = readTsconfig(tsconfigPath);
			const matchConfig = tsconfig;

			assertFilesMatch(matchConfig, tsFiles);
		});
	});

	describe('caching', () => {
		test('same config, different paths', async () => {
			await using fixture = await createFixture({
				'a/tsconfig.json': createTsconfigJson({
					include: ['src'],
				}),
				'a/src/index.ts': '',
				'b/tsconfig.json': createTsconfigJson({
					include: ['lib'],
				}),
				'b/lib/index.ts': '',
			});

			const tsconfigA = readTsconfig(fixture.getPath('a/tsconfig.json'));
			const tsconfigB = readTsconfig(fixture.getPath('b/tsconfig.json'));

			expect(isFileIncluded(tsconfigA, fixture.getPath('a/src/index.ts'))).toBe(true);
			expect(isFileIncluded(tsconfigA, fixture.getPath('b/lib/index.ts'))).toBe(false);
			expect(isFileIncluded(tsconfigB, fixture.getPath('b/lib/index.ts'))).toBe(true);
			expect(isFileIncluded(tsconfigB, fixture.getPath('a/src/index.ts'))).toBe(false);
		});

		test('repeated calls hit cache', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({}),
				'a.ts': '',
				'b.ts': '',
				'c.ts': '',
			});

			const tsconfig = readTsconfig(fixture.getPath('tsconfig.json'));

			expect(isFileIncluded(tsconfig, fixture.getPath('a.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, fixture.getPath('b.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, fixture.getPath('c.ts'))).toBe(true);
		});

		test('cache uses object identity - mutation returns stale results', () => {
			const projectDirectory = '/project-root';
			const tsconfig: TsConfigResult = {
				config: { include: ['src'] },
				path: path.join(projectDirectory, 'tsconfig.json'),
			};

			expect(isFileIncluded(tsconfig, path.join(projectDirectory, 'src/index.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, path.join(projectDirectory, 'lib/index.ts'))).toBe(false);

			// Mutating the config does NOT invalidate the cache.
			// This is expected — tsconfig objects should be treated as immutable.
			tsconfig.config.include = ['lib'];
			expect(isFileIncluded(tsconfig, path.join(projectDirectory, 'lib/index.ts'))).toBe(false);
		});
	});
});
