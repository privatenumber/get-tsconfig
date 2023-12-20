import path from 'path';
import { expect, testSuite } from 'manten';
import slash from 'slash';
import { createFixture } from 'fs-fixture';
import typescript from 'typescript';
import { isFsCaseSensitive } from 'is-fs-case-sensitive';
import { createTsconfigJson } from '../utils.js';
import {
	createFilesMatcher,
	parseTsconfig,
	type TsConfigJsonResolved,
	type FileMatcher,
} from '#get-tsconfig';

const fsCaseSensitive = isFsCaseSensitive();

const isWindows = process.platform === 'win32';

const assertFilesMatch = (
	matcher: FileMatcher,
	files: string[],
) => {
	for (const file of files) {
		expect(matcher(file)).toBeTruthy();

		if (isWindows) {
			expect(matcher(file.replaceAll('/', '\\'))).toBeTruthy();
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

export default testSuite(({ describe }) => {
	describe('createFilesMatcher', ({ describe }) => {
		describe('error handling', ({ test }) => {
			test('should throw on relative path', async () => {
				const tsconfig: TsConfigJsonResolved = {};
				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'index.ts': '',
				});

				const matches = createFilesMatcher({
					config: tsconfig,
					path: path.join(fixture.path, 'tsconfig.json'),
				});

				expect(() => matches('index.ts')).toThrow('Path must be absolute');

				await fixture.rm();
			});

			test('should not match path outside of directory', async () => {
				const tsconfig: TsConfigJsonResolved = {};

				const tsconfigSubpath = 'some-dir/tsconfig.json';
				const fixture = await createFixture({
					[tsconfigSubpath]: createTsconfigJson(tsconfig),
					'index.ts': '',
				});

				const tsconfigPath = path.join(fixture.path, tsconfigSubpath);
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches('/index.ts')).toBe(undefined);

				await fixture.rm();
			});
		});

		describe('files', ({ test }) => {
			test('disables default include', async () => {
				const tsconfig: TsConfigJsonResolved = {
					files: ['index.ts'],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'index.ts': '',
					'no-match.ts': '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);

				expect(tsFiles).toStrictEqual([
					slash(path.join(fixture.path, 'index.ts')),
				]);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				assertFilesMatch(matches, tsFiles);
				expect(matches(path.join(fixture.path, 'no-match.ts'))).toBe(undefined);

				await fixture.rm();
			});

			test('files outside of project', async () => {
				const tsconfig: TsConfigJsonResolved = {
					files: ['../index.ts'],
				};

				const fixture = await createFixture({
					'project/tsconfig.json': createTsconfigJson(tsconfig),
					'index.ts': '',
				});

				const tsconfigPath = path.join(fixture.path, 'project/tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([
					slash(path.join(fixture.path, 'index.ts')),
				]);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
			});

			test('files takes precedence over extensions', async () => {
				const tsconfig: TsConfigJsonResolved = {
					files: ['some-dir/index.js'],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'some-dir/index.js': '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([
					slash(path.join(fixture.path, 'some-dir/index.js')),
				]);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
			});

			test('files takes precedence over exclude', async () => {
				const tsconfig: TsConfigJsonResolved = {
					files: ['some-dir/index.ts'],
					exclude: ['some-dir/index.ts'],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'some-dir/index.ts': '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([
					slash(path.join(fixture.path, 'some-dir/index.ts')),
				]);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
			});
		});

		describe('include', ({ test, describe }) => {
			test('default include matches all TS files', async () => {
				const tsconfig: TsConfigJsonResolved = {};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'some-directory': testFiles,
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
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

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					directory: testFiles,
					'ends-with-slash': testFiles,
					[periodInPath]: testFiles,
					'no-match': testFiles,
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(21);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
			});

			test('include matches nested directories', async () => {
				const tsconfig: TsConfigJsonResolved = {
					include: ['dir-a'],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'dir-a/dir-b/dir-c': testFiles,
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
			});

			test('should not match directory with prefix', async () => {
				const tsconfig: TsConfigJsonResolved = {
					include: ['dir-a'],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'dir-abc': testFiles,
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches(
					path.join(fixture.path, 'dir-abc/ts.ts'),
				)).toBe(undefined);

				await fixture.rm();
			});

			test('relative parent directory', async () => {
				const tsconfig: TsConfigJsonResolved = {
					include: ['../src'],
				};

				const fixture = await createFixture({
					'src/a.ts': '',
					'project/tsconfig.json': createTsconfigJson(tsconfig),
				});

				const tsconfigPath = path.join(fixture.path, 'project/tsconfig.json');

				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([
					slash(path.join(fixture.path, 'src/a.ts')),
				]);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
			});

			describe('hidden files', ({ test }) => {
				test('should not match hidden files by default', async () => {
					const directoryName = 'some-dir';
					const tsconfig: TsConfigJsonResolved = {};

					const fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						[directoryName]: Object.fromEntries(
							fileNames.map(fileName => [`.${fileName}`, '']),
						),
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(0);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});
					expect(matches(
						path.join(fixture.path, directoryName, '.index.ts'),
					)).toBe(undefined);

					await fixture.rm();
				});

				test('should not match hidden directory by default', async () => {
					const directoryName = '.hidden-dir';
					const tsconfig: TsConfigJsonResolved = {};

					const fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						[directoryName]: testFiles,
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(0);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});
					expect(matches(
						path.join(fixture.path, directoryName, 'index.ts'),
					)).toBe(undefined);

					await fixture.rm();
				});

				test('explicit directory name without star should not match', async () => {
					const directoryName = '.hidden-dir';

					const tsconfig: TsConfigJsonResolved = {
						include: [directoryName],
					};

					const fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						[directoryName]: testFiles,
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(0);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});
					expect(matches(
						path.join(fixture.path, directoryName, 'index.ts'),
					)).toBe(undefined);

					await fixture.rm();
				});

				test('explicit directory name with star should match', async () => {
					const directoryName = '.hidden-dir';

					const tsconfig: TsConfigJsonResolved = {
						include: [`${directoryName}/*`],
					};

					const fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						[directoryName]: testFiles,
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(7);

					assertFilesMatch(
						createFilesMatcher({
							config: tsconfig,
							path: tsconfigPath,
						}),
						tsFiles,
					);
					await fixture.rm();
				});

				test('explicit hidden glob should match hidden directory', async () => {
					const directoryName = '.hidden-dir';

					const tsconfig: TsConfigJsonResolved = {
						include: ['.*/*'],
					};

					const fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						[directoryName]: testFiles,
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(7);

					assertFilesMatch(
						createFilesMatcher({
							config: tsconfig,
							path: tsconfigPath,
						}),
						tsFiles,
					);
					await fixture.rm();
				});

				test('explicit hidden glob should match hidden files', async () => {
					const directoryName = 'some-dir';

					const tsconfig: TsConfigJsonResolved = {
						include: ['**/.*'],
					};

					const fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						[directoryName]: Object.fromEntries(
							fileNames.map(fileName => [`.${fileName}`, '']),
						),
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(7);

					assertFilesMatch(
						createFilesMatcher({
							config: tsconfig,
							path: tsconfigPath,
						}),
						tsFiles,
					);
					await fixture.rm();
				});
			});

			for (const directory of ['node_modules', 'bower_components', 'jspm_packages']) {
				describe(directory, ({ test }) => {
					test('exclude by default', async () => {
						const directoryName = `${directory}/some-pkg`;
						const tsconfig: TsConfigJsonResolved = {};

						const fixture = await createFixture({
							'tsconfig.json': createTsconfigJson(tsconfig),
							[directoryName]: testFiles,
						});

						const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
						const tsFiles = getTscMatchingFiles(tsconfigPath);
						expect(tsFiles.length).toBe(0);

						const matches = createFilesMatcher({
							config: tsconfig,
							path: tsconfigPath,
						});
						expect(matches(
							path.join(fixture.path, directoryName, 'index.ts'),
						)).toBe(undefined);

						await fixture.rm();
					});

					test('explictly include', async () => {
						const tsconfig: TsConfigJsonResolved = {
							include: [directory],
						};

						const fixture = await createFixture({
							'tsconfig.json': createTsconfigJson(tsconfig),
							[`${directory}/some-pkg`]: testFiles,
						});

						const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
						const tsFiles = getTscMatchingFiles(tsconfigPath);
						expect(tsFiles.length).toBe(7);

						assertFilesMatch(
							createFilesMatcher({
								config: tsconfig,
								path: tsconfigPath,
							}),
							tsFiles,
						);
						await fixture.rm();
					});

					test(`project in ${directory}`, async () => {
						const tsconfig: TsConfigJsonResolved = {};

						const fixture = await createFixture({
							[directory]: {
								'tsconfig.json': createTsconfigJson(tsconfig),
								'some-dir': testFiles,
							},
						});

						const tsconfigPath = path.join(fixture.path, directory, 'tsconfig.json');
						const tsFiles = getTscMatchingFiles(tsconfigPath);
						expect(tsFiles.length).toBe(7);

						assertFilesMatch(
							createFilesMatcher({
								config: tsconfig,
								path: tsconfigPath,
							}),
							tsFiles,
						);
						await fixture.rm();
					});
				});
			}

			describe('case sensitivity', ({ test }) => {
				test('default', async () => {
					const projectDirectory = '/project-root';
					const matches = createFilesMatcher({
						config: {
							include: ['SOME-DIR'],
						},
						path: path.join(projectDirectory, 'tsconfig.json'),
					});

					expect(matches(
						path.join(projectDirectory, 'SOME-DIR/INDEX.ts'),
					)).toBeTruthy();

					if (fsCaseSensitive) {
						expect(matches(
							path.join(projectDirectory, 'some-dir/index.ts'),
						)).toBe(undefined);
					} else {
						expect(matches(
							path.join(projectDirectory, 'some-dir/index.ts'),
						)).toBeTruthy();
					}
				});

				test('case sensitive', async () => {
					const projectDirectory = '/project-root';
					const matches = createFilesMatcher(
						{
							config: {
								include: ['SOME-DIR'],
							},
							path: path.join(projectDirectory, 'tsconfig.json'),
						},
						true,
					);

					expect(matches(
						path.join(projectDirectory, 'SOME-DIR/index.ts'),
					)).toBeTruthy();
					expect(matches(
						path.join(projectDirectory, 'some-dir/index.ts'),
					)).toBe(undefined);
				});
			});

			describe('globs', ({ describe, test }) => {
				test('?', async () => {
					const tsconfig: TsConfigJsonResolved = {
						include: [
							'some-dir/?.ts',
							'some-dir/?b??ts',
						],
					};

					const fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						'some-dir': {
							'a.ts': '',
							'abc.ts': '',
							'nested-dir': {
								'd.ts': '',
							},
						},
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(2);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					assertFilesMatch(matches, tsFiles);
					expect(matches(
						path.join(fixture.path, 'some-dir/nested-dir/d.ts'),
					)).toBe(undefined);

					await fixture.rm();
				});

				describe('*', ({ test }) => {
					test('single', async () => {
						const tsconfig: TsConfigJsonResolved = {
							include: ['*'],
						};

						const fixture = await createFixture({
							'tsconfig.json': createTsconfigJson(tsconfig),
							'a.ts': '',
						});

						const tsconfigPath = path.join(fixture.path, 'tsconfig.json');

						const tsFiles = getTscMatchingFiles(tsconfigPath);
						expect(tsFiles).toStrictEqual([
							slash(path.join(fixture.path, 'a.ts')),
						]);

						assertFilesMatch(
							createFilesMatcher({
								config: tsconfig,
								path: tsconfigPath,
							}),
							tsFiles,
						);

						await fixture.rm();
					});

					test('multiple', async () => {
						const tsconfig: TsConfigJsonResolved = {
							include: [
								'some-dir/*b*',
								'some-dir/dot*ts',
							],
						};

						const fixture = await createFixture({
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

						const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
						const tsFiles = getTscMatchingFiles(tsconfigPath);
						expect(tsFiles).toStrictEqual([
							path.join(fixture.path, 'some-dir/aaabccc.ts'),
							path.join(fixture.path, 'some-dir/dot.ts'),
						].map(slash));

						const matches = createFilesMatcher({
							config: tsconfig,
							path: tsconfigPath,
						});

						assertFilesMatch(matches, tsFiles);
						expect(matches(
							path.join(fixture.path, 'some-dir/nested-dir/d.ts'),
						)).toBe(undefined);

						await fixture.rm();
					});
				});

				test('**/', async () => {
					const tsconfig: TsConfigJsonResolved = {
						include: ['some-dir/**/*'],
					};

					const fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						'some-dir': {
							'a.ts': '',
							'bc.ts': '',
							'nested-dir': {
								'd.ts': '',
							},
						},
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles).toStrictEqual([
						path.join(fixture.path, 'some-dir/a.ts'),
						path.join(fixture.path, 'some-dir/bc.ts'),
						path.join(fixture.path, 'some-dir/nested-dir/d.ts'),
					].map(slash));

					assertFilesMatch(
						createFilesMatcher({
							config: tsconfig,
							path: tsconfigPath,
						}),
						tsFiles,
					);
					await fixture.rm();
				});
			});
		});

		describe('.min.js', ({ test }) => {
			const filePath = 'some-dir/index.min.js';

			test('explicit files', async () => {
				const tsconfig: TsConfigJsonResolved = {
					compilerOptions: {
						allowJs: true,
					},
					files: [filePath],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[filePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([
					slash(path.join(fixture.path, filePath)),
				]);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
			});

			test('explicit include', async () => {
				const tsconfig: TsConfigJsonResolved = {
					compilerOptions: {
						allowJs: true,
					},
					include: [filePath],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[filePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([
					slash(path.join(fixture.path, filePath)),
				]);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
			});

			test('empty exclude', async () => {
				const tsconfig: TsConfigJsonResolved = {
					compilerOptions: {
						allowJs: true,
					},
					exclude: [],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[filePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches(
					path.join(fixture.path, filePath),
				)).toBe(undefined);

				await fixture.rm();
			});

			test('empty exclude with directory include', async () => {
				const tsconfig: TsConfigJsonResolved = {
					compilerOptions: {
						allowJs: true,
					},
					include: ['some-dir'],
					exclude: [],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[filePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches(
					path.join(fixture.path, filePath),
				)).toBe(undefined);

				await fixture.rm();
			});
		});

		describe('exclude', ({ test, describe }) => {
			describe('default: outDir & declarationDir', ({ test }) => {
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

					const fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						...directories,
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(0);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					for (const filePath of directoryFileNames) {
						const absoluteFilePath = path.join(fixture.path, filePath);
						expect(matches(absoluteFilePath)).toBe(undefined);
					}

					await fixture.rm();
				});

				test('overwritable', async () => {
					const tsconfig: TsConfigJsonResolved = {
						compilerOptions: {
							outDir: 'out-dir',
							declarationDir: 'declaration-dir',
						},
						exclude: [],
					};

					const fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						...directories,
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);

					expect(tsFiles).toStrictEqual(
						directoryFileNames.map(filePath => slash(path.join(fixture.path, filePath))).sort(),
					);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					for (const filePath of directoryFileNames) {
						const absoluteFilePath = path.join(fixture.path, filePath);
						expect(matches(absoluteFilePath)).toBeTruthy();
					}

					await fixture.rm();
				});
			});

			test('exclude takes precedence over include', async () => {
				const tsconfig: TsConfigJsonResolved = {
					include: ['some-dir'],
					exclude: ['some-dir'],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'some-dir/index.ts': '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches(
					path.join(fixture.path, 'some-dir/index.ts'),
				)).toBe(undefined);

				await fixture.rm();
			});

			test('should not ignore directory with prefix', async () => {
				const tsconfig: TsConfigJsonResolved = {
					exclude: ['dir-prefix'],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					'dir-prefixabc': testFiles,
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(7);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
			});

			describe('case sensitivity', ({ test }) => {
				test('default', async () => {
					const projectDirectory = '/project-root';
					const matches = createFilesMatcher({
						config: {
							exclude: ['SOME-DIR'],
						},
						path: path.join(projectDirectory, 'tsconfig.json'),
					});

					expect(matches(
						path.join(projectDirectory, 'SOME-DIR/INDEX.ts'),
					)).toBe(undefined);

					if (fsCaseSensitive) {
						expect(matches(
							path.join(projectDirectory, 'some-dir/index.ts'),
						)).toBeTruthy();
					} else {
						expect(matches(
							path.join(projectDirectory, 'some-dir/index.ts'),
						)).toBe(undefined);
					}
				});

				test('case sensitive', async () => {
					const projectDirectory = '/project-root';
					const matches = createFilesMatcher(
						{
							config: {
								exclude: ['SOME-DIR'],
							},
							path: path.join(projectDirectory, 'tsconfig.json'),
						},
						true,
					);

					expect(matches(
						path.join(projectDirectory, 'SOME-DIR/index.ts'),
					)).toBe(undefined);
					expect(matches(
						path.join(projectDirectory, 'some-dir/index.ts'),
					)).toBeTruthy();
				});
			});

			describe('globs', ({ test }) => {
				test('?', async () => {
					const tsconfig: TsConfigJsonResolved = {
						exclude: [
							'some-dir/?.ts',
							'some-dir/?b??ts',
						],
					};

					const fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						'some-dir': {
							'a.ts': '',
							'abc.ts': '',
							'nested-dir': {
								'd.ts': '',
							},
						},
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);

					expect(tsFiles).toStrictEqual([
						slash(path.join(fixture.path, 'some-dir/nested-dir/d.ts')),
					]);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					expect(matches(
						path.join(fixture.path, 'some-dir/a.ts'),
					)).toBe(undefined);
					expect(matches(
						path.join(fixture.path, 'some-dir/abc.ts'),
					)).toBe(undefined);

					assertFilesMatch(matches, tsFiles);

					await fixture.rm();
				});

				test('*', async () => {
					const tsconfig: TsConfigJsonResolved = {
						exclude: [
							'some-dir/*b*',
							'some-dir/q*eee*t*',
						],
					};

					const fixture = await createFixture({
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

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles).toStrictEqual([
						path.join(fixture.path, 'some-dir/a.ts'),
						path.join(fixture.path, 'some-dir/nested-dir/d.ts'),
					].map(slash));

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					assertFilesMatch(matches, tsFiles);
					expect(matches(
						path.join(fixture.path, 'some-dir/abc.ts'),
					)).toBe(undefined);
					expect(matches(
						path.join(fixture.path, 'some-dir/qwwweeerrrt.ts'),
					)).toBe(undefined);

					await fixture.rm();
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

					const fixture = await createFixture({
						'tsconfig.json': createTsconfigJson(tsconfig),
						...Object.fromEntries(
							files.map(fileName => [fileName, '']),
						),
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles).toStrictEqual([
						slash(path.join(fixture.path, files[0])),
					]);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					expect(matches(
						path.join(fixture.path, files[0]),
					)).toBeTruthy();
					expect(matches(
						path.join(fixture.path, files[1]),
					)).toBe(undefined);
					expect(matches(
						path.join(fixture.path, files[2]),
					)).toBe(undefined);

					await fixture.rm();
				});
			});
		});

		describe('.js', ({ test }) => {
			test('should not match', async () => {
				const tsconfig: TsConfigJsonResolved = {};

				const jsFilePath = 'index.js';
				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[jsFilePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');

				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});
				expect(matches(
					path.join(fixture.path, jsFilePath),
				)).toBe(undefined);

				await fixture.rm();
			});

			test('should match with allowJs', async () => {
				const tsconfig: TsConfigJsonResolved = {
					compilerOptions: {
						allowJs: true,
					},
				};

				const jsFilePath = 'index.js';
				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[jsFilePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);

				expect(tsFiles).toStrictEqual([
					slash(path.join(fixture.path, jsFilePath)),
				]);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
			});

			test('shouldnt match .js even if explicitly in "includes"', async () => {
				const filePath = 'file.js';
				const tsconfig: TsConfigJsonResolved = {
					include: [filePath],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[filePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});
				expect(matches(
					path.join(fixture.path, filePath),
				)).toBe(undefined);

				await fixture.rm();
			});

			test('matches .js if explicitly in "files"', async () => {
				const filePath = 'file.js';
				const tsconfig: TsConfigJsonResolved = {
					files: [filePath],
				};

				const fixture = await createFixture({
					'tsconfig.json': createTsconfigJson(tsconfig),
					[filePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);

				// Matches but errors: Did you mean to enable the 'allowJs' option?
				expect(tsFiles).toStrictEqual([
					slash(path.join(fixture.path, filePath)),
				]);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
			});
		});

		describe('extends', ({ test }) => {
			test('must be resolved', async () => {
				expect(
					() => createFilesMatcher({
						config: {
							// @ts-expect-error extends must be pre-resolved
							extends: '../tsconfig.json',
						},
						path: '',
					}),
				).toThrow('tsconfig#extends must be resolved. Use getTsconfig or parseTsconfig to resolve it.');
			});

			test('should match', async () => {
				const fixture = await createFixture({
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

				const tsconfigPath = path.join(fixture.path, 'project/tsconfig.json');

				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([
					slash(path.join(fixture.path, 'project/b.js')),
				]);

				const tsconfig = parseTsconfig(tsconfigPath);

				assertFilesMatch(
					createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					}),
					tsFiles,
				);

				await fixture.rm();
			});
		});
	});
});
