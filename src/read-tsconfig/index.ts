import path from 'node:path';
import slash from 'slash';
import type {
	TsconfigJson,
	TsconfigJsonResolved,
	TsconfigResult,
	GetExtendsChainOptions,
	ReadTsconfigOptions,
} from '../types.js';
import { normalizeRelativePath } from '../utils/normalize-relative-path.js';
import { readJsonc } from '../utils/read-jsonc.js';
import { implicitBaseUrlSymbol, configDirPlaceholder } from '../utils/constants.js';
import { resolveExtendsPath } from './resolve-extends-path.js';
import { normalizeCompilerOptions } from './normalize-compiler-options.js';

const pathRelative = (from: string, to: string) => normalizeRelativePath(path.relative(from, to));

const filesProperties = [
	'files',
	'include',
	'exclude',
] as const;

/**
 * Resolves a path from extended config to canonical form relative to parent config.
 * TypeScript normalizes these paths: nested/../. → .
 * Used for: baseUrl, outDir, rootDir, declarationDir
 */
const resolveAndRelativize = (
	fromDirectoryPath: string,
	extendsDirectoryPath: string,
	filePath: string,
): string => {
	const absolutePath = path.join(extendsDirectoryPath, filePath);
	const relativePath = path.relative(fromDirectoryPath, absolutePath);
	return slash(relativePath) || './';
};

/**
 * Prefixes a pattern with relative directory path without normalization.
 * TypeScript literally prefixes: nested/../. stays as nested/../.
 * Used for: files, include, exclude patterns
 */
const prefixPattern = (
	fromDirectoryPath: string,
	extendsDirectoryPath: string,
	pattern: string,
): string => {
	const relativeDir = path.relative(fromDirectoryPath, extendsDirectoryPath);
	if (!relativeDir) {
		return pattern;
	}

	// Remove leading ./ from pattern to avoid double prefix like ./some-dir/./file.ts
	const cleanPattern = pattern.startsWith('./') ? pattern.slice(2) : pattern;
	return slash(`${relativeDir}/${cleanPattern}`);
};

const outputFields = [
	'outDir',
	'declarationDir',
] as const;

const interpolateConfigDir = (
	filePath: string,
	configDir: string,
) => {
	if (filePath.startsWith(configDirPlaceholder)) {
		return slash(path.join(configDir, filePath.slice(configDirPlaceholder.length)));
	}
};

/**
 * @see https://github.com/microsoft/TypeScript/issues/57485#issuecomment-2027787456
 * exclude paths, as it requires custom processing
 */
const compilerFieldsWithConfigDir = [
	'outDir',
	'declarationDir',
	'outFile',
	'rootDir',
	'baseUrl',
	'tsBuildInfoFile',
] as const;

/**
 * Collects the extends chain for a tsconfig file.
 *
 * Walks the filesystem to discover all configs in the extends chain,
 * returning them as a flat array with `extends` resolved to absolute paths.
 *
 * @param tsconfigPath - Path to the tsconfig file.
 * @param options - Optional read configuration.
 * @param options.cache - Cache for filesystem reads (default: new `Map()`).
 * @returns Array of `{ path, config }` entries. `chain[0]` is the root config.
 * Ordered root-first, deepest ancestor last.
 */
export const getExtendsChain = (
	tsconfigPath: string,
	options: GetExtendsChainOptions = {},
): TsconfigResult<TsconfigJson>[] => {
	const { cache = new Map() } = options;
	const resolvedPath = path.resolve(tsconfigPath);
	const chain: TsconfigResult<TsconfigJson>[] = [];
	const visited = new Set<string>();

	const collect = (
		configPath: string,
		circularTracker: Set<string>,
	) => {
		const normalizedPath = slash(configPath);
		if (visited.has(normalizedPath)) {
			return;
		}

		visited.add(normalizedPath);

		let config: TsconfigJson;
		try {
			config = readJsonc(configPath, cache) || {};
		} catch {
			throw new Error(`Cannot resolve tsconfig at path: ${configPath}`);
		}

		if (typeof config !== 'object') {
			throw new SyntaxError(`Failed to parse tsconfig at: ${configPath}`);
		}

		const directoryPath = path.dirname(configPath);

		if (config.extends) {
			const extendsIsArray = Array.isArray(config.extends);
			const extendsList = extendsIsArray
				? config.extends as string[]
				: [config.extends as string];

			const resolvedExtends = extendsList.map((extendsValue) => {
				const resolved = resolveExtendsPath(extendsValue, directoryPath, cache);
				if (!resolved) {
					throw new Error(`File '${extendsValue}' not found.`);
				}

				const resolvedNormalized = slash(resolved);
				if (circularTracker.has(resolvedNormalized) || resolvedNormalized === normalizedPath) {
					throw new Error(`Circularity detected while resolving configuration: ${resolvedNormalized}`);
				}

				return resolvedNormalized;
			});

			config.extends = extendsIsArray
				? resolvedExtends
				: resolvedExtends[0];

			chain.push({
				path: normalizedPath,
				config,
			});

			const nextTracker = new Set(circularTracker);
			nextTracker.add(normalizedPath);

			for (const resolvedExtendsPath of [...resolvedExtends].reverse()) {
				collect(resolvedExtendsPath, nextTracker);
			}
		} else {
			chain.push({
				path: normalizedPath,
				config,
			});
		}
	};

	collect(resolvedPath, new Set());
	return chain;
};

/**
 * Resolves a collected extends chain into a merged tsconfig.
 *
 * Pure function — no filesystem access. Expects the output of
 * `getExtendsChain` or an equivalent acyclic, root-first chain
 * with `extends` resolved to absolute paths.
 *
 * @param chain - Array of `{ path, config }` entries. `chain[0]` is the
 * root config. Must be acyclic — cyclic extends will cause infinite recursion.
 * @returns The resolved tsconfig with path and fully merged config.
 */
export const resolveExtendsChain = (
	chain: TsconfigResult<TsconfigJson>[],
): TsconfigResult => {
	if (chain.length === 0) {
		throw new Error('Chain must not be empty');
	}

	const lookup = new Map(chain.map(entry => [entry.path, entry]));
	const resolvedCache = new Map<string, TsconfigJsonResolved>();

	type WithImplicitBaseUrl = TsconfigJson.CompilerOptions & {
		[implicitBaseUrlSymbol]: string;
	};

	const cloneResolved = (config: TsconfigJsonResolved) => {
		const cloned = structuredClone(config);

		// structuredClone drops symbol properties — copy from source
		const sourceOptions = config.compilerOptions as WithImplicitBaseUrl | undefined;
		if (sourceOptions && implicitBaseUrlSymbol in sourceOptions) {
			const clonedOptions = cloned.compilerOptions as WithImplicitBaseUrl;
			clonedOptions[implicitBaseUrlSymbol] = sourceOptions[implicitBaseUrlSymbol];
		}

		return cloned;
	};

	const resolveEntry = (entryPath: string): TsconfigJsonResolved => {
		const cached = resolvedCache.get(entryPath);
		if (cached) {
			return cloneResolved(cached);
		}

		const entry = lookup.get(entryPath);
		if (!entry) {
			throw new Error(`Config not found in chain: ${entryPath}`);
		}

		// structuredClone drops symbol-keyed properties by spec.
		// implicitBaseUrlSymbol is set after cloning, so this is safe.
		let config: TsconfigJson = structuredClone(entry.config);
		const directoryPath = path.dirname(entryPath);

		if (config.compilerOptions) {
			const { compilerOptions } = config;
			if (
				compilerOptions.paths
				&& !compilerOptions.baseUrl
			) {
				(compilerOptions as WithImplicitBaseUrl)[implicitBaseUrlSymbol] = directoryPath;
			}
		}

		if (config.extends) {
			const extendsPathList = (
				Array.isArray(config.extends)
					? config.extends
					: [config.extends]
			);

			delete config.extends;

			for (const extendsPath of extendsPathList.reverse()) {
				const extendsConfig = resolveEntry(extendsPath);
				delete extendsConfig.references;

				const extendsDirectoryPath = path.dirname(extendsPath);

				const { compilerOptions } = extendsConfig;
				if (compilerOptions) {
					const { baseUrl } = compilerOptions;
					if (baseUrl && !baseUrl.startsWith(configDirPlaceholder)) {
						compilerOptions.baseUrl = resolveAndRelativize(
							directoryPath,
							extendsDirectoryPath,
							baseUrl,
						);
					}

					const { outDir } = compilerOptions;
					if (outDir && !outDir.startsWith(configDirPlaceholder)) {
						compilerOptions.outDir = resolveAndRelativize(
							directoryPath,
							extendsDirectoryPath,
							outDir,
						);
					}
				}

				for (const property of filesProperties) {
					const filesList = extendsConfig[property];
					if (filesList) {
						extendsConfig[property] = filesList.map((file) => {
							if (file.startsWith(configDirPlaceholder)) {
								return file;
							}

							return prefixPattern(directoryPath, extendsDirectoryPath, file);
						});
					}
				}

				const merged = {
					...extendsConfig,
					...config,

					compilerOptions: {
						...extendsConfig.compilerOptions,
						...config.compilerOptions,
					},
				};

				if (extendsConfig.watchOptions) {
					merged.watchOptions = {
						...extendsConfig.watchOptions,
						...config.watchOptions,
					};
				}
				config = merged;
			}
		}

		if (config.compilerOptions) {
			const { compilerOptions } = config;
			const normalizedPaths = [
				'baseUrl',
				'rootDir',
			] as const;

			for (const property of normalizedPaths) {
				const unresolvedPath = compilerOptions[property];
				if (unresolvedPath && !unresolvedPath.startsWith(configDirPlaceholder)) {
					const resolvedBaseUrl = path.resolve(directoryPath, unresolvedPath);
					const relativeBaseUrl = pathRelative(directoryPath, resolvedBaseUrl);
					compilerOptions[property] = relativeBaseUrl;
				}
			}

			for (const outputField of outputFields) {
				let outputPath = compilerOptions[outputField];

				if (outputPath) {
					if (!Array.isArray(config.exclude)) {
						config.exclude = outputFields
							.map(field => compilerOptions[field])
							.filter(Boolean) as string[];
					}

					if (!outputPath.startsWith(configDirPlaceholder)) {
						outputPath = normalizeRelativePath(outputPath);
					}

					compilerOptions[outputField] = outputPath;
				}
			}
		} else {
			config.compilerOptions = {};
		}

		if (config.include) {
			config.include = config.include.map(slash);

			if (config.files) {
				delete config.files;
			}
		} else if (config.files) {
			config.files = config.files.map(file => (
				file.startsWith(configDirPlaceholder)
					? file
					: normalizeRelativePath(file)
			));
		}

		if (config.watchOptions) {
			const { watchOptions } = config;

			if (watchOptions.excludeDirectories) {
				watchOptions.excludeDirectories = watchOptions.excludeDirectories.map(
					excludePath => slash(path.resolve(directoryPath, excludePath)),
				);
			}

			if (watchOptions.excludeFiles) {
				watchOptions.excludeFiles = watchOptions.excludeFiles.map(
					excludePath => slash(path.resolve(directoryPath, excludePath)),
				);
			}

			if (watchOptions.watchFile) {
				watchOptions.watchFile = watchOptions.watchFile.toLowerCase() as
					TsconfigJson.WatchOptions['watchFile'];
			}

			if (watchOptions.watchDirectory) {
				watchOptions.watchDirectory = watchOptions.watchDirectory.toLowerCase() as
					TsconfigJson.WatchOptions['watchDirectory'];
			}

			if (watchOptions.fallbackPolling) {
				watchOptions.fallbackPolling = watchOptions.fallbackPolling.toLowerCase() as
					TsconfigJson.WatchOptions['fallbackPolling'];
			}
		}

		resolvedCache.set(entryPath, config);
		// Return a clone so callers can mutate without corrupting the cache
		return cloneResolved(config);
	};

	const root = chain[0];
	const config = resolveEntry(root.path);
	const configDir = path.dirname(root.path);

	const { compilerOptions } = config;
	if (compilerOptions) {
		for (const property of compilerFieldsWithConfigDir) {
			const value = compilerOptions[property];
			if (value) {
				const resolvedPath = interpolateConfigDir(value, configDir);
				compilerOptions[property] = resolvedPath ? pathRelative(configDir, resolvedPath) : value;
			}
		}

		for (const property of ['rootDirs', 'typeRoots'] as const) {
			const value = compilerOptions[property];
			if (value) {
				compilerOptions[property] = value.map((v) => {
					const resolvedPath = interpolateConfigDir(v, configDir);
					return resolvedPath ? pathRelative(configDir, resolvedPath) : v;
				});
			}
		}

		const { paths } = compilerOptions;
		if (paths) {
			for (const name of Object.keys(paths)) {
				paths[name] = paths[name].map(
					filePath => interpolateConfigDir(filePath, configDir) ?? filePath,
				);
			}
		}

		normalizeCompilerOptions(compilerOptions);
	}

	for (const property of filesProperties) {
		const value = config[property];
		if (value) {
			config[property] = value.map(
				filePath => interpolateConfigDir(filePath, configDir) ?? filePath,
			);
		}
	}

	return {
		path: root.path,
		config,
		sources: chain.map(entry => entry.path),
	};
};

/**
 * Reads and resolves a tsconfig file at a given path
 *
 * @param tsconfigPath - Path to the tsconfig file.
 * @param options - Optional read configuration.
 * @param options.cache - Cache for filesystem reads and resolution results
 * (default: new `Map()`).
 * @returns The resolved absolute path and config. The path is the same one used
 * internally for extends resolution.
 */
export const readTsconfig = (
	tsconfigPath: string,
	options: ReadTsconfigOptions = {},
): TsconfigResult => {
	const { cache = new Map() } = options;
	const chain = getExtendsChain(tsconfigPath, { cache });
	return resolveExtendsChain(chain);
};
