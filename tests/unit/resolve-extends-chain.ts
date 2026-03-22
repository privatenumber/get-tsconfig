import { describe, test, expect } from 'manten';
import { resolveExtendsChain, type TsconfigJson, type TsconfigResult } from '#get-tsconfig';
import { projectDir, tsconfigPath } from '../utils/unit-helpers.ts';

const entry = (entryPath: string, config: TsconfigJson): TsconfigResult<TsconfigJson> => ({
	path: entryPath,
	config,
});

const getImplicitBaseUrl = (
	compilerOptions: Record<string | symbol, unknown>,
): unknown => {
	const symbol = Object.getOwnPropertySymbols(compilerOptions).find(
		s => s.toString() === 'Symbol(implicitBaseUrl)',
	);
	return symbol ? compilerOptions[symbol] : undefined;
};

describe('resolveExtendsChain', () => {
	describe('config merging basics', () => {
		test('single entry returns config with compilerOptions: {}', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {}),
			]);
			expect(result.path).toBe(tsconfigPath);
			expect(result.config.compilerOptions).toStrictEqual({});
		});

		test('single entry preserves existing compilerOptions', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { strict: true },
				}),
			]);
			expect(result.config.compilerOptions!.strict).toBe(true);
		});

		test('child overrides parent for top-level compilerOptions', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
					compilerOptions: { target: 'es2022' },
				}),
				entry(parentPath, {
					compilerOptions: { target: 'es5' },
				}),
			]);
			expect(result.config.compilerOptions!.target).toBe('es2022');
		});

		test('compilerOptions deep merge — child wins per key, parent fills gaps', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
					compilerOptions: { strict: true },
				}),
				entry(parentPath, {
					compilerOptions: {
						strict: false,
						outDir: './dist',
					},
				}),
			]);
			expect(result.config.compilerOptions!.strict).toBe(true);
			expect(result.config.compilerOptions!.outDir).toBe('./dist');
		});

		test('watchOptions deep merge — child wins per key, parent fills gaps', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
					watchOptions: { watchFile: 'UseFsEvents' },
				}),
				entry(parentPath, {
					watchOptions: {
						watchFile: 'FixedPollingInterval',
						watchDirectory: 'UseFsEvents',
					},
				}),
			]);
			expect(result.config.watchOptions!.watchFile).toBe('usefsevents');
			expect(result.config.watchOptions!.watchDirectory).toBe('usefsevents');
		});

		test('references not inherited from parent', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
				}),
				entry(parentPath, {
					references: [{ path: './packages/a' }],
				}),
			]);
			expect(result.config.references).toBeUndefined();
		});

		test('files — child wins entirely over parent', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
					files: ['./child.ts'],
				}),
				entry(parentPath, {
					files: ['./parent.ts'],
				}),
			]);
			expect(result.config.files).toStrictEqual(['./child.ts']);
		});

		test('include — child wins entirely over parent', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
					include: ['src/**/*'],
				}),
				entry(parentPath, {
					include: ['lib/**/*'],
				}),
			]);
			expect(result.config.include).toStrictEqual(['src/**/*']);
		});

		test('exclude — child wins entirely over parent', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
					exclude: ['node_modules'],
				}),
				entry(parentPath, {
					exclude: ['dist'],
				}),
			]);
			expect(result.config.exclude).toStrictEqual(['node_modules']);
		});

		test('files/include/exclude — all inherited from parent', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
				}),
				entry(parentPath, {
					files: ['./parent.ts'],
					include: ['lib/**/*'],
					exclude: ['dist'],
				}),
			]);
			// files and include coexist independently
			expect(result.config.include).toStrictEqual(['lib/**/*']);
			expect(result.config.files).toStrictEqual(['./parent.ts']);
			expect(result.config.exclude).toStrictEqual(['dist']);
		});

		test('files preserved when child has include', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
					include: ['src/**/*'],
				}),
				entry(parentPath, {
					files: ['./parent.ts'],
				}),
			]);
			expect(result.config.include).toStrictEqual(['src/**/*']);
			expect(result.config.files).toStrictEqual(['./parent.ts']);
		});

		test('parent has include, child has neither — parent include inherited', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
					compilerOptions: { strict: true },
				}),
				entry(parentPath, {
					include: ['lib/**/*'],
				}),
			]);
			expect(result.config.include).toStrictEqual(['lib/**/*']);
			// include present means files dropped
			expect(result.config.files).toBeUndefined();
		});
	});

	describe('array extends', () => {
		test('extends: [A, B] — B has higher priority than A', () => {
			const basePath = `${projectDir}/base.json`;
			const overridePath = `${projectDir}/override.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: [basePath, overridePath],
				}),
				entry(basePath, {
					compilerOptions: {
						target: 'es5',
						strict: true,
					},
				}),
				entry(overridePath, {
					compilerOptions: { target: 'es2022' },
				}),
			]);
			expect(result.config.compilerOptions!.target).toBe('es2022');
			// strict from A still fills gap
			expect(result.config.compilerOptions!.strict).toBe(true);
		});

		test('three-way merge with array extends', () => {
			const aPath = `${projectDir}/a.json`;
			const bPath = `${projectDir}/b.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: [aPath, bPath],
					compilerOptions: { outDir: './dist' },
				}),
				entry(aPath, {
					compilerOptions: {
						target: 'es5',
						strict: true,
					},
				}),
				entry(bPath, {
					compilerOptions: {
						target: 'es2022',
						module: 'commonjs',
					},
				}),
			]);
			// child wins outDir
			expect(result.config.compilerOptions!.outDir).toBe('./dist');
			// B wins target over A
			expect(result.config.compilerOptions!.target).toBe('es2022');
			// B fills module
			expect(result.config.compilerOptions!.module).toBe('commonjs');
			// A fills strict
			expect(result.config.compilerOptions!.strict).toBe(true);
		});
	});

	describe('diamond dependencies', () => {
		test('A and B both extend C — C resolved once, merged correctly', () => {
			const aPath = `${projectDir}/a.json`;
			const bPath = `${projectDir}/b.json`;
			const cPath = `${projectDir}/c.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: [aPath, bPath],
				}),
				entry(aPath, {
					extends: cPath,
					compilerOptions: { strict: true },
				}),
				entry(bPath, {
					extends: cPath,
					compilerOptions: { module: 'commonjs' },
				}),
				entry(cPath, {
					compilerOptions: { target: 'es5' },
				}),
			]);
			// strict from A
			expect(result.config.compilerOptions!.strict).toBe(true);
			// module from B
			expect(result.config.compilerOptions!.module).toBe('commonjs');
			// target from C
			expect(result.config.compilerOptions!.target).toBe('es5');
		});
	});

	describe('path rebasing', () => {
		test("parent's baseUrl rebased relative to child directory", () => {
			const parentDir = `${projectDir}/configs`;
			const parentPath = `${parentDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
				}),
				entry(parentPath, {
					compilerOptions: { baseUrl: './src' },
				}),
			]);
			// configs/src relative to project → configs/src
			expect(result.config.compilerOptions!.baseUrl).toBe('./configs/src');
		});

		test("parent's outDir rebased relative to child directory", () => {
			const parentDir = `${projectDir}/configs`;
			const parentPath = `${parentDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
				}),
				entry(parentPath, {
					compilerOptions: { outDir: './dist' },
				}),
			]);
			expect(result.config.compilerOptions!.outDir).toBe('./configs/dist');
		});

		test("parent's files patterns prefixed with relative path", () => {
			const parentDir = `${projectDir}/configs`;
			const parentPath = `${parentDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
				}),
				entry(parentPath, {
					files: ['./index.ts'],
				}),
			]);
			expect(result.config.files).toStrictEqual(['./configs/index.ts']);
		});

		test("parent's include patterns prefixed with relative path", () => {
			const parentDir = `${projectDir}/configs`;
			const parentPath = `${parentDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
				}),
				entry(parentPath, {
					include: ['src/**/*'],
				}),
			]);
			expect(result.config.include).toStrictEqual(['configs/src/**/*']);
		});

		test("parent's exclude patterns prefixed with relative path", () => {
			const parentDir = `${projectDir}/configs`;
			const parentPath = `${parentDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
				}),
				entry(parentPath, {
					include: ['src/**/*'],
					exclude: ['dist'],
				}),
			]);
			expect(result.config.exclude).toStrictEqual(['configs/dist']);
		});

		test('same directory parent — no prefix added to patterns', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
				}),
				entry(parentPath, {
					include: ['src/**/*'],
				}),
			]);
			expect(result.config.include).toStrictEqual(['src/**/*']);
		});
	});

	describe('root finalization', () => {
		test('baseUrl normalized to relative path', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { baseUrl: './src/../lib' },
				}),
			]);
			expect(result.config.compilerOptions!.baseUrl).toBe('./lib');
		});

		test('rootDir normalized to relative path', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { rootDir: './src/../lib' },
				}),
			]);
			expect(result.config.compilerOptions!.rootDir).toBe('./lib');
		});

		test('baseUrl "." normalized to "./"', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { baseUrl: '.' },
				}),
			]);
			expect(result.config.compilerOptions!.baseUrl).toBe('./');
		});

		test('outDir auto-added to exclude when exclude not specified', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { outDir: './dist' },
				}),
			]);
			expect(result.config.exclude).toContain('./dist');
		});

		test('declarationDir auto-added to exclude when exclude not specified', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { declarationDir: './types' },
				}),
			]);
			expect(result.config.exclude).toContain('./types');
		});

		test('outDir and declarationDir both auto-added to exclude', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: {
						outDir: './dist',
						declarationDir: './types',
					},
				}),
			]);
			expect(result.config.exclude).toContain('./dist');
			expect(result.config.exclude).toContain('./types');
		});

		test('outDir NOT auto-added when exclude is explicit', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { outDir: './dist' },
					exclude: ['node_modules'],
				}),
			]);
			expect(result.config.exclude).toStrictEqual(['node_modules']);
		});

		test('declarationDir NOT auto-added when exclude is explicit', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { declarationDir: './types' },
					exclude: ['node_modules'],
				}),
			]);
			expect(result.config.exclude).toStrictEqual(['node_modules']);
		});

		test('normalizeCompilerOptions applied at the end', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { strict: true },
				}),
			]);
			// strict: true implies noImplicitAny, etc.
			expect(result.config.compilerOptions!.noImplicitAny).toBe(true);
			expect(result.config.compilerOptions!.strictNullChecks).toBe(true);
		});
	});

	describe('watchOptions normalization', () => {
		test('watchFile lowercased', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					watchOptions: { watchFile: 'UseFsEvents' },
				}),
			]);
			expect(result.config.watchOptions!.watchFile).toBe('usefsevents');
		});

		test('watchDirectory lowercased', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					watchOptions: { watchDirectory: 'UseFsEvents' },
				}),
			]);
			expect(result.config.watchOptions!.watchDirectory).toBe('usefsevents');
		});

		test('fallbackPolling lowercased', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					watchOptions: { fallbackPolling: 'DynamicPriority' },
				}),
			]);
			expect(result.config.watchOptions!.fallbackPolling).toBe('dynamicpriority');
		});

		test('excludeDirectories resolved to absolute paths', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					watchOptions: { excludeDirectories: ['node_modules'] },
				}),
			]);
			expect(result.config.watchOptions!.excludeDirectories).toStrictEqual([
				`${projectDir}/node_modules`,
			]);
		});

		test('excludeFiles resolved to absolute paths', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					watchOptions: { excludeFiles: ['temp.ts'] },
				}),
			]);
			expect(result.config.watchOptions!.excludeFiles).toStrictEqual([
				`${projectDir}/temp.ts`,
			]);
		});
	});

	describe('implicitBaseUrlSymbol', () => {
		test('set when config has paths but no baseUrl', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: {
						paths: { '@/*': ['./src/*'] },
					},
				}),
			]);
			expect(getImplicitBaseUrl(result.config.compilerOptions!)).toBe(projectDir);
		});

		test('not set when baseUrl exists', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: {
						baseUrl: '.',
						paths: { '@/*': ['./src/*'] },
					},
				}),
			]);
			expect(getImplicitBaseUrl(result.config.compilerOptions!)).toBeUndefined();
		});

		test('not set when no paths', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { strict: true },
				}),
			]);
			expect(getImplicitBaseUrl(result.config.compilerOptions!)).toBeUndefined();
		});
	});

	describe('sources field', () => {
		test('contains paths of all chain entries', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, { extends: parentPath }),
				entry(parentPath, {}),
			]);
			expect(result.sources).toStrictEqual([tsconfigPath, parentPath]);
		});

		test('sources[0] equals result.path', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, { extends: parentPath }),
				entry(parentPath, {}),
			]);
			expect(result.sources![0]).toBe(result.path);
		});

		test('single entry has sources with only itself', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {}),
			]);
			expect(result.sources).toStrictEqual([tsconfigPath]);
		});

		test('array extends includes all sources', () => {
			const aPath = `${projectDir}/a.json`;
			const bPath = `${projectDir}/b.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, { extends: [aPath, bPath] }),
				entry(aPath, {}),
				entry(bPath, {}),
			]);
			expect(result.sources).toStrictEqual([tsconfigPath, aPath, bPath]);
		});
	});

	describe('error cases', () => {
		test('empty chain throws', () => {
			expect(() => resolveExtendsChain([])).toThrow('Chain must not be empty');
		});

		test('config path not found in chain throws', () => {
			const missingPath = `${projectDir}/missing.json`;
			expect(() => resolveExtendsChain([
				entry(tsconfigPath, {
					extends: missingPath,
				}),
			])).toThrow(`Config not found in chain: ${missingPath}`);
		});
	});

	describe('edge cases', () => {
		test('both parent and child lack compilerOptions', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, { extends: parentPath }),
				entry(parentPath, {}),
			]);
			expect(result.config.compilerOptions).toStrictEqual({});
		});

		test('parent with compilerOptions, child without', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, { extends: parentPath }),
				entry(parentPath, {
					compilerOptions: { strict: true },
				}),
			]);
			expect(result.config.compilerOptions!.strict).toBe(true);
		});

		test('config with only extends and nothing else', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, { extends: parentPath }),
				entry(parentPath, {
					compilerOptions: { target: 'es2022' },
				}),
			]);
			expect(result.config.compilerOptions!.target).toBe('es2022');
			expect((result.config as TsconfigJson).extends).toBeUndefined();
		});

		test('extends property removed from resolved config', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, { extends: parentPath }),
				entry(parentPath, {}),
			]);
			expect((result.config as TsconfigJson).extends).toBeUndefined();
		});

		test('child with compilerOptions, parent without', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
					compilerOptions: { strict: true },
				}),
				entry(parentPath, {}),
			]);
			expect(result.config.compilerOptions!.strict).toBe(true);
		});

		test('deeply nested extends chain', () => {
			const grandparentPath = `${projectDir}/grandparent.json`;
			const parentPath = `${projectDir}/parent.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, { extends: parentPath }),
				entry(parentPath, {
					extends: grandparentPath,
					compilerOptions: { strict: true },
				}),
				entry(grandparentPath, {
					compilerOptions: {
						target: 'es5',
						module: 'commonjs',
					},
				}),
			]);
			expect(result.config.compilerOptions!.target).toBe('es5');
			expect(result.config.compilerOptions!.module).toBe('commonjs');
			expect(result.config.compilerOptions!.strict).toBe(true);
		});

		test('files normalized with normalizeRelativePath', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					files: ['src/index.ts'],
				}),
			]);
			expect(result.config.files).toStrictEqual(['./src/index.ts']);
		});

		test('include with files — both preserved', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					files: ['./index.ts'],
					include: ['src/**/*'],
				}),
			]);
			expect(result.config.include).toStrictEqual(['src/**/*']);
			expect(result.config.files).toStrictEqual(['./index.ts']);
		});
	});

	describe('configDir interpolation', () => {
		test('${configDir} in outDir resolved relative to root config', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { outDir: '${configDir}/dist' },
				}),
			]);
			expect(result.config.compilerOptions!.outDir).toBe('./dist');
		});

		test('${configDir} in baseUrl resolved relative to root config', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { baseUrl: '${configDir}/src' },
				}),
			]);
			expect(result.config.compilerOptions!.baseUrl).toBe('./src');
		});

		test('${configDir} in paths values resolved', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: {
						paths: { '@/*': ['${configDir}/src/*'] },
					},
				}),
			]);
			const paths = result.config.compilerOptions!.paths!;
			expect(paths['@/*']).toStrictEqual([`${projectDir}/src/*`]);
		});

		test('${configDir} in rootDirs resolved', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: {
						rootDirs: ['${configDir}/src', '${configDir}/generated'],
					},
				}),
			]);
			expect(result.config.compilerOptions!.rootDirs).toStrictEqual([
				'./src',
				'./generated',
			]);
		});

		test('${configDir} in files resolved', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					files: ['${configDir}/globals.d.ts'],
				}),
			]);
			expect(result.config.files).toStrictEqual([`${projectDir}/globals.d.ts`]);
		});

		test('${configDir} in include resolved', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					include: ['${configDir}/src/**/*'],
				}),
			]);
			expect(result.config.include).toStrictEqual([`${projectDir}/src/**/*`]);
		});

		test('${configDir} in parent not rebased — preserved through merge', () => {
			const parentDir = `${projectDir}/configs`;
			const parentPath = `${parentDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
				}),
				entry(parentPath, {
					compilerOptions: { outDir: '${configDir}/dist' },
				}),
			]);
			// ${configDir} not rebased — interpolated at root level relative to root configDir
			expect(result.config.compilerOptions!.outDir).toBe('./dist');
		});

		test('${configDir} patterns in files/include/exclude not prefixed during rebase', () => {
			const parentDir = `${projectDir}/configs`;
			const parentPath = `${parentDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
				}),
				entry(parentPath, {
					include: ['${configDir}/src/**/*'],
				}),
			]);
			// ${configDir} patterns are not prefixed with relative path during rebase
			expect(result.config.include).toStrictEqual([`${projectDir}/src/**/*`]);
		});
	});

	describe('watchOptions inherited from parent', () => {
		test('parent watchOptions inherited when child has none', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
				}),
				entry(parentPath, {
					watchOptions: { watchFile: 'UseFsEvents' },
				}),
			]);
			expect(result.config.watchOptions!.watchFile).toBe('usefsevents');
		});

		test('child watchOptions override when parent has none', () => {
			const parentPath = `${projectDir}/base.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
					watchOptions: { watchFile: 'FixedPollingInterval' },
				}),
				entry(parentPath, {}),
			]);
			expect(result.config.watchOptions!.watchFile).toBe('fixedpollinginterval');
		});
	});

	describe('outDir normalization', () => {
		test('outDir normalized with normalizeRelativePath', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { outDir: 'dist' },
				}),
			]);
			expect(result.config.compilerOptions!.outDir).toBe('./dist');
		});

		test('declarationDir normalized with normalizeRelativePath', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: { declarationDir: 'types' },
				}),
			]);
			expect(result.config.compilerOptions!.declarationDir).toBe('./types');
		});
	});

	describe('multi-level path rebasing', () => {
		test('grandparent paths rebased through each level', () => {
			const configsDir = `${projectDir}/configs`;
			const parentPath = `${configsDir}/base.json`;
			const sharedDir = `${configsDir}/shared`;
			const grandparentPath = `${sharedDir}/common.json`;
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					extends: parentPath,
				}),
				entry(parentPath, {
					extends: grandparentPath,
				}),
				entry(grandparentPath, {
					compilerOptions: { outDir: './dist' },
					include: ['src/**/*'],
				}),
			]);
			// outDir: grandparent's ./dist rebased through parent, then to root
			// grandparent dir: configs/shared, relative to parent dir: configs → shared/dist
			// then parent rebased relative to root → configs/shared/dist
			expect(result.config.compilerOptions!.outDir).toBe('./configs/shared/dist');
			expect(result.config.include).toStrictEqual(['configs/shared/src/**/*']);
		});
	});

	describe('typeRoots interpolation', () => {
		test('${configDir} in typeRoots resolved', () => {
			const result = resolveExtendsChain([
				entry(tsconfigPath, {
					compilerOptions: {
						typeRoots: ['${configDir}/types', '${configDir}/node_modules/@types'],
					},
				}),
			]);
			expect(result.config.compilerOptions!.typeRoots).toStrictEqual([
				'./types',
				'./node_modules/@types',
			]);
		});
	});
});
