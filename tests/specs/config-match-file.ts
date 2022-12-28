import path from 'path';
import { expect, testSuite } from 'manten';
import { createFixture } from 'fs-fixture';
import typescript from 'typescript';
import { tsconfigJsonString } from '../utils.js';
import { createFilesMatcher, type TsConfigJsonResolved } from '#get-tsconfig';

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

export default testSuite(({ describe, test }) => {
	// test('default include matches all TS files', async () => {
	// 	const tsconfig: TsConfigJsonResolved = {
	// 		include: ['**/*'],
	// 	};
	// 	// console.log('Input:\n' + tsconfig.include[0])

	// 	const fixture = await createFixture({
	// 		'tsconfig.json': tsconfigJsonString(tsconfig),
	// 		'some-directory': testFiles,
	// 	});

	// 	const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
	// 	const tsFiles = getTscMatchingFiles(tsconfigPath);
	// 	const matches = createFilesMatcher({
	// 		config: tsconfig,
	// 		path: tsconfigPath,
	// 	});

	// 	for (const file of tsFiles.slice(0, 1)) {
	// 		expect(matches(file)).toBe(true);
	// 	}

	// 	await fixture.rm();
	// });

	describe('match file', ({ test, describe }) => {
		test('should throw on relative path', async () => {
			const tsconfig: TsConfigJsonResolved = {};
			const fixture = await createFixture({
				'tsconfig.json': tsconfigJsonString(tsconfig),
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
				[tsconfigSubpath]: tsconfigJsonString(tsconfig),
				'index.ts': '',
			});

			const tsconfigPath = path.join(fixture.path, tsconfigSubpath);
			const tsFiles = getTscMatchingFiles(tsconfigPath);
			expect(tsFiles.length).toBe(0);

			const matches = createFilesMatcher({
				config: tsconfig,
				path: tsconfigPath,
			});

			expect(matches('/index.ts')).toBe(false);

			await fixture.rm();
		});

		describe('.json', () => {
			test('should not match .json', async () => {
				const filePath = 'json.json';
				const tsconfig: TsConfigJsonResolved = {
					include: [filePath],
				};

				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString(tsconfig),
					[filePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');

				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});
				expect(matches(path.join(fixture.path, filePath))).toBe(false);

				await fixture.rm();
			});

			test('should match .json', async () => {
				const filePath = 'json.json';
				const tsconfig: TsConfigJsonResolved = {
					compilerOptions: {
						resolveJsonModule: true,
					},
					include: [filePath],
				};

				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString(tsconfig),
					'index.ts': 'import json from "./json.json"',
					[filePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);

				const absoluteFilePath = path.join(fixture.path, filePath);
				expect(tsFiles).toStrictEqual([absoluteFilePath]);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});
				expect(matches(absoluteFilePath)).toBe(true);

				await fixture.rm();
			});
		});

		describe('files', ({ test }) => {
			test('disables default include', async () => {
				const tsconfig: TsConfigJsonResolved = {
					files: ['index.ts'],
				};

				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString(tsconfig),
					'index.ts': '',
					'no-match.ts': '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);

				const indexFile = path.join(fixture.path, 'index.ts');
				expect(tsFiles).toStrictEqual([indexFile]);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches(indexFile)).toBe(true);
				expect(matches(path.join(fixture.path, 'no-match.ts'))).toBe(false);

				await fixture.rm();
			});
		});

		describe('include', ({ test, describe }) => {
			test('default include matches all TS files', async () => {
				const tsconfig: TsConfigJsonResolved = {};

				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString(tsconfig),
					'some-directory': testFiles,
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				for (const file of tsFiles) {
					expect(matches(file)).toBe(true);
				}

				await fixture.rm();
			});

			test('specific directories', async () => {
				const tsconfig: TsConfigJsonResolved = {
					include: [
						'dir-a',
						'non-existent',
					],
				};

				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString(tsconfig),
					'dir-a': testFiles,
					'dir-b': testFiles,
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).not.toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				for (const file of tsFiles) {
					expect(matches(file)).toBe(true);
				}

				await fixture.rm();
			});

			test('include matches nested directories', async () => {
				const tsconfig: TsConfigJsonResolved = {
					include: ['dir-a'],
				};

				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString(tsconfig),
					'dir-a/dir-b/dir-c': testFiles,
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				for (const file of tsFiles) {
					expect(matches(file)).toBe(true);
				}

				await fixture.rm();
			});

			test('should not match directory with prefix', async () => {
				const tsconfig: TsConfigJsonResolved = {
					include: ['dir-a'],
				};

				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString(tsconfig),
					'dir-abc': testFiles,
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches(path.join(fixture.path, 'dir-abc/ts.ts'))).toBe(false);

				await fixture.rm();
			});

			describe('hidden files', ({ test }) => {
				test('should not match hidden files by default', async () => {
					const directoryName = 'some-dir';
					const tsconfig: TsConfigJsonResolved = {};

					const fixture = await createFixture({
						'tsconfig.json': tsconfigJsonString(tsconfig),
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
					expect(matches(path.join(fixture.path, directoryName, '.index.ts'))).toBe(false);

					await fixture.rm();
				});

				test('should not match hidden directory by default', async () => {
					const directoryName = '.hidden-dir';
					const tsconfig: TsConfigJsonResolved = {};

					const fixture = await createFixture({
						'tsconfig.json': tsconfigJsonString(tsconfig),
						[directoryName]: testFiles,
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(0);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});
					expect(matches(path.join(fixture.path, directoryName, 'index.ts'))).toBe(false);

					await fixture.rm();
				});

				test('explicit directory name without star should not match', async () => {
					const directoryName = '.hidden-dir';

					const tsconfig: TsConfigJsonResolved = {
						include: [directoryName],
					};

					const fixture = await createFixture({
						'tsconfig.json': tsconfigJsonString(tsconfig),
						[directoryName]: testFiles,
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(0);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});
					expect(matches(path.join(fixture.path, directoryName, 'index.ts'))).toBe(false);

					await fixture.rm();
				});

				test('explicit directory name with star should match', async () => {
					const directoryName = '.hidden-dir';

					const tsconfig: TsConfigJsonResolved = {
						include: [`${directoryName}/*`],
					};

					const fixture = await createFixture({
						'tsconfig.json': tsconfigJsonString(tsconfig),
						[directoryName]: testFiles,
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(7);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					for (const file of tsFiles) {
						expect(matches(file)).toBe(true);
					}

					await fixture.rm();
				});

				test('explicit hidden glob should match hidden directory', async () => {
					const directoryName = '.hidden-dir';

					const tsconfig: TsConfigJsonResolved = {
						include: ['.*/*'],
					};

					const fixture = await createFixture({
						'tsconfig.json': tsconfigJsonString(tsconfig),
						[directoryName]: testFiles,
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(7);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					for (const file of tsFiles) {
						expect(matches(file)).toBe(true);
					}

					await fixture.rm();
				});

				test('explicit hidden glob should match hidden files', async () => {
					const directoryName = 'some-dir';

					const tsconfig: TsConfigJsonResolved = {
						include: ['**/.*'],
					};

					const fixture = await createFixture({
						'tsconfig.json': tsconfigJsonString(tsconfig),
						[directoryName]: Object.fromEntries(
							fileNames.map(fileName => [`.${fileName}`, '']),
						),
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles.length).toBe(7);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					for (const file of tsFiles) {
						expect(matches(file)).toBe(true);
					}

					await fixture.rm();
				});
			});

			for (const directory of ['node_modules', 'bower_components', 'jspm_packages']) {
				describe(directory, ({ test }) => {
					test('exclude by default', async () => {
						const directoryName = `${directory}/some-pkg`;
						const tsconfig: TsConfigJsonResolved = {};

						const fixture = await createFixture({
							'tsconfig.json': tsconfigJsonString(tsconfig),
							[directoryName]: testFiles,
						});

						const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
						const tsFiles = getTscMatchingFiles(tsconfigPath);
						expect(tsFiles.length).toBe(0);

						const matches = createFilesMatcher({
							config: tsconfig,
							path: tsconfigPath,
						});
						expect(matches(path.join(fixture.path, directoryName, 'index.ts'))).toBe(false);

						await fixture.rm();
					});

					test('explictly include', async () => {
						const tsconfig: TsConfigJsonResolved = {
							include: [directory],
						};

						const fixture = await createFixture({
							'tsconfig.json': tsconfigJsonString(tsconfig),
							[`${directory}/some-pkg`]: testFiles,
						});

						const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
						const tsFiles = getTscMatchingFiles(tsconfigPath);
						expect(tsFiles.length).toBe(7);

						const matches = createFilesMatcher({
							config: tsconfig,
							path: tsconfigPath,
						});

						for (const file of tsFiles) {
							expect(matches(file)).toBe(true);
						}

						await fixture.rm();
					});

					test(`project in ${directory}`, async () => {
						const tsconfig: TsConfigJsonResolved = {};

						const fixture = await createFixture({
							[directory]: {
								'tsconfig.json': tsconfigJsonString(tsconfig),
								'some-dir': testFiles,
							},
						});

						const tsconfigPath = path.join(fixture.path, directory, 'tsconfig.json');
						const tsFiles = getTscMatchingFiles(tsconfigPath);
						expect(tsFiles.length).toBe(7);

						const matches = createFilesMatcher({
							config: tsconfig,
							path: tsconfigPath,
						});

						for (const file of tsFiles) {
							expect(matches(file)).toBe(true);
						}

						await fixture.rm();
					});
				});
			}

			test('case insensitive', async () => {
				const tsconfig: TsConfigJsonResolved = {
					include: ['SOME-DIR'],
				};

				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString(tsconfig),
					'some-dir/index.ts': '',
				});

				const filePath = path.join(fixture.path, 'some-dir/index.ts');

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([filePath]);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});
				expect(matches(filePath)).toBe(true);

				await fixture.rm();
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

				expect(matches(path.join(projectDirectory, 'SOME-DIR/file.ts'))).toBe(true);
				expect(matches(path.join(projectDirectory, 'some-dir/file.ts'))).toBe(false);
			});

			describe('globs', ({ test }) => {
				test('?', async () => {
					const tsconfig: TsConfigJsonResolved = {
						include: [
							'some-dir/?.ts',
							'some-dir/?b?.ts',
						],
					};

					const fixture = await createFixture({
						'tsconfig.json': tsconfigJsonString(tsconfig),
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

					for (const file of tsFiles) {
						expect(matches(file)).toBe(true);
					}
					expect(matches(path.join(fixture.path, 'some-dir/nested-dir/d.ts'))).toBe(false);

					await fixture.rm();
				});

				test('*', async () => {
					const tsconfig: TsConfigJsonResolved = {
						include: [
							'some-dir/*',
							'some-dir/*b*',
						],
					};

					const fixture = await createFixture({
						'tsconfig.json': tsconfigJsonString(tsconfig),
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

					for (const file of tsFiles) {
						expect(matches(file)).toBe(true);
					}
					expect(matches(path.join(fixture.path, 'some-dir/nested-dir/d.ts'))).toBe(false);

					await fixture.rm();
				});

				test('**/', async () => {
					const tsconfig: TsConfigJsonResolved = {
						include: ['some-dir/**/*'],
					};

					const fixture = await createFixture({
						'tsconfig.json': tsconfigJsonString(tsconfig),
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
					expect(tsFiles.length).toBe(3);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					expect(matches(path.join(fixture.path, 'some-dir/a.ts'))).toBe(true);
					expect(matches(path.join(fixture.path, 'some-dir/bc.ts'))).toBe(true);
					expect(matches(path.join(fixture.path, 'some-dir/nested-dir/d.ts'))).toBe(true);

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
					'tsconfig.json': tsconfigJsonString(tsconfig),
					[filePath]: '',
				});

				const filePathAbsolute = path.join(fixture.path, filePath);

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([filePathAbsolute]);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches(filePathAbsolute)).toBe(true);

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
					'tsconfig.json': tsconfigJsonString(tsconfig),
					[filePath]: '',
				});

				const filePathAbsolute = path.join(fixture.path, filePath);

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles).toStrictEqual([filePathAbsolute]);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches(filePathAbsolute)).toBe(true);

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
					'tsconfig.json': tsconfigJsonString(tsconfig),
					[filePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches(path.join(fixture.path, filePath))).toBe(false);

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
					'tsconfig.json': tsconfigJsonString(tsconfig),
					[filePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches(path.join(fixture.path, filePath))).toBe(false);

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
						'tsconfig.json': tsconfigJsonString(tsconfig),
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
						expect(matches(absoluteFilePath)).toBe(false);
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
						'tsconfig.json': tsconfigJsonString(tsconfig),
						...directories,
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);

					expect(tsFiles).toStrictEqual(
						directoryFileNames.map(filePath => path.join(fixture.path, filePath)).sort(),
					);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					for (const filePath of directoryFileNames) {
						const absoluteFilePath = path.join(fixture.path, filePath);
						expect(matches(absoluteFilePath)).toBe(true);
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
					'tsconfig.json': tsconfigJsonString(tsconfig),
					'some-dir/index.ts': '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches(path.join(fixture.path, 'some-dir/index.ts'))).toBe(false);

				await fixture.rm();
			});

			test('should not ignore directory with prefix', async () => {
				const tsconfig: TsConfigJsonResolved = {
					exclude: ['dir-prefix'],
				};

				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString(tsconfig),
					'dir-prefixabc': testFiles,
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(7);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});

				expect(matches(path.join(fixture.path, 'dir-prefixabc/ts.ts'))).toBe(true);

				await fixture.rm();
			});

			describe('globs', ({ test }) => {
				test('?', async () => {
					const tsconfig: TsConfigJsonResolved = {
						exclude: ['some-dir/?.ts'],
					};

					const fixture = await createFixture({
						'tsconfig.json': tsconfigJsonString(tsconfig),
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
						path.join(fixture.path, 'some-dir/bc.ts'),
						path.join(fixture.path, 'some-dir/nested-dir/d.ts'),
					]);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					expect(matches(path.join(fixture.path, 'some-dir/a.ts'))).toBe(false);
					expect(matches(path.join(fixture.path, 'some-dir/bc.ts'))).toBe(true);
					expect(matches(path.join(fixture.path, 'some-dir/nested-dir/d.ts'))).toBe(true);

					await fixture.rm();
				});

				test('*', async () => {
					const tsconfig: TsConfigJsonResolved = {
						exclude: ['some-dir/*'],
					};

					const files = [
						'a.ts',
						'some-dir/b.ts',
						'some-dir/nested-dir/c.ts',
					];
					const fixture = await createFixture({
						'tsconfig.json': tsconfigJsonString(tsconfig),
						...Object.fromEntries(
							files.map(fileName => [fileName, '']),
						),
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles).toStrictEqual([
						path.join(fixture.path, files[0]),
					]);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					expect(matches(path.join(fixture.path, files[0]))).toBe(true);
					expect(matches(path.join(fixture.path, files[1]))).toBe(false);
					expect(matches(path.join(fixture.path, files[2]))).toBe(false);

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
						'tsconfig.json': tsconfigJsonString(tsconfig),
						...Object.fromEntries(
							files.map(fileName => [fileName, '']),
						),
					});

					const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
					const tsFiles = getTscMatchingFiles(tsconfigPath);
					expect(tsFiles).toStrictEqual([
						path.join(fixture.path, files[0]),
					]);

					const matches = createFilesMatcher({
						config: tsconfig,
						path: tsconfigPath,
					});

					expect(matches(path.join(fixture.path, files[0]))).toBe(true);
					expect(matches(path.join(fixture.path, files[1]))).toBe(false);
					expect(matches(path.join(fixture.path, files[2]))).toBe(false);

					await fixture.rm();
				});
			});
		});

		describe('.js', ({ test }) => {
			test('should not match', async () => {
				const tsconfig: TsConfigJsonResolved = {};

				const tsconfigPath = 'tsconfig.json';
				const jsFilePath = 'index.js';
				const fixture = await createFixture({
					[tsconfigPath]: tsconfigJsonString(tsconfig),
					[jsFilePath]: '',
				});

				const absoluteTsconfigPath = path.join(fixture.path, tsconfigPath);

				const tsFiles = getTscMatchingFiles(absoluteTsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: absoluteTsconfigPath,
				});
				expect(matches(path.join(fixture.path, jsFilePath))).toBe(false);

				await fixture.rm();
			});

			test('should match with allowJs', async () => {
				const tsconfig: TsConfigJsonResolved = {
					compilerOptions: {
						allowJs: true,
					},
				};

				const tsconfigPath = 'tsconfig.json';
				const jsFilePath = 'index.js';
				const fixture = await createFixture({
					[tsconfigPath]: tsconfigJsonString(tsconfig),
					[jsFilePath]: '',
				});

				const absoluteTsconfigPath = path.join(fixture.path, tsconfigPath);
				const tsFiles = getTscMatchingFiles(absoluteTsconfigPath);

				const absoluteJsFilePath = path.join(fixture.path, jsFilePath);
				expect(tsFiles).toStrictEqual([absoluteJsFilePath]);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: absoluteTsconfigPath,
				});
				expect(matches(absoluteJsFilePath)).toBe(true);

				await fixture.rm();
			});

			test('shouldnt match .js even if explicitly in "includes"', async () => {
				const filePath = 'file.js';
				const tsconfig: TsConfigJsonResolved = {
					include: [filePath],
				};

				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString(tsconfig),
					[filePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);
				expect(tsFiles.length).toBe(0);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});
				expect(matches(path.join(fixture.path, filePath))).toBe(false);

				await fixture.rm();
			});

			test('shouldnt match .js even if explicitly in "files"', async () => {
				const filePath = 'file.js';
				const tsconfig: TsConfigJsonResolved = {
					files: [filePath],
				};

				const fixture = await createFixture({
					'tsconfig.json': tsconfigJsonString(tsconfig),
					[filePath]: '',
				});

				const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
				const tsFiles = getTscMatchingFiles(tsconfigPath);

				// Matches but errors: Did you mean to enable the 'allowJs' option?
				expect(tsFiles.length).toBe(1);

				const matches = createFilesMatcher({
					config: tsconfig,
					path: tsconfigPath,
				});
				expect(matches(path.join(fixture.path, filePath))).toBe(false);

				await fixture.rm();
			});
		});
	});
});
