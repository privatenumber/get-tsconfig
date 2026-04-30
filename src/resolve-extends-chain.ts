import path from 'node:path';
import slash from 'slash';
import type {
	TsconfigJson,
	TsconfigJsonResolved,
	TsconfigResult,
	ResolveExtendsChainOptions,
} from './types.js';
import { implicitBaseUrlSymbol, configDirPlaceholder } from './utils/constants.js';
import { normalizeRelativePath } from './utils/path.js';
import { normalizeCompilerOptions } from './normalize-compiler-options.js';
import { applyVersionDefaults } from './version-defaults/index.js';

const pathRelative = (from: string, to: string) => normalizeRelativePath(path.relative(from, to));

const filesProperties = [
	'files',
	'include',
	'exclude',
] as const;

/**
 * Resolves a path from extended config to canonical form relative to parent config.
 * TypeScript normalizes these paths: nested/../. → .
 * Used for: baseUrl, outDir, declarationDir, rootDir, rootDirs, typeRoots
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
 * Resolves a collected extends chain into a merged tsconfig.
 *
 * Pure function — no filesystem access. Expects the output of
 * `getExtendsChain` or an equivalent acyclic, root-first chain
 * with `extends` resolved to absolute paths.
 *
 * @param chain - Array of `{ path, config }` entries. `chain[0]` is the
 * root config. Must be acyclic — cyclic extends will cause infinite recursion.
 * @param options - Optional resolution configuration.
 * @param options.typescriptVersion - Apply unconditional compiler-option
 * defaults for the given TypeScript version (e.g. `'6.0.0'`). Must be a
 * literal version string; this lower-level API does not accept `'auto'` —
 * detection is the caller's responsibility (see `readTsconfig`).
 * @returns The resolved tsconfig with path and fully merged config.
 */
export const resolveExtendsChain = (
	chain: TsconfigResult<TsconfigJson>[],
	options: ResolveExtendsChainOptions = {},
): TsconfigResult => {
	if (chain.length === 0) {
		throw new Error('Chain must not be empty');
	}

	const { typescriptVersion } = options;

	const lookup = new Map(chain.map(entry => [entry.path, entry]));
	const resolvedCache = new Map<string, TsconfigJsonResolved>();

	type WithImplicitBaseUrl = TsconfigJson.CompilerOptions & {
		[implicitBaseUrlSymbol]: string;
	};

	const resolveEntry = (entryPath: string): TsconfigJsonResolved => {
		const cached = resolvedCache.get(entryPath);
		if (cached) {
			return cached;
		}

		const entry = lookup.get(entryPath);
		if (!entry) {
			throw new Error(`Config not found in chain: ${entryPath}`);
		}

		const entryConfig = entry.config;
		const directoryPath = path.dirname(entryPath);

		// Build fresh working copy — spread nested objects that get mutated
		let config: TsconfigJsonResolved = {
			...entryConfig,
			...(entryConfig.compilerOptions && {
				compilerOptions: { ...entryConfig.compilerOptions },
			}),
			...(entryConfig.watchOptions && {
				watchOptions: { ...entryConfig.watchOptions },
			}),
		};
		delete (config as TsconfigJson).extends;

		if (config.compilerOptions?.paths && !config.compilerOptions.baseUrl) {
			(config.compilerOptions as WithImplicitBaseUrl)[implicitBaseUrlSymbol] = directoryPath;
		}

		if (entryConfig.extends) {
			const extendsPathList = (
				Array.isArray(entryConfig.extends)
					? entryConfig.extends
					: [entryConfig.extends]
			);

			for (const extendsPath of extendsPathList.toReversed()) {
				const parentConfig = resolveEntry(extendsPath);
				const extendsDirectoryPath = path.dirname(extendsPath);

				// Build fresh rebased parent — never mutate parentConfig
				const { references: _references, ...rebasedParent } = parentConfig;

				if (rebasedParent.compilerOptions) {
					const parentCompilerOptions = { ...rebasedParent.compilerOptions };

					for (const field of ['baseUrl', 'outDir', 'declarationDir', 'rootDir'] as const) {
						const value = parentCompilerOptions[field];
						if (value && !value.startsWith(configDirPlaceholder)) {
							parentCompilerOptions[field] = resolveAndRelativize(
								directoryPath,
								extendsDirectoryPath,
								value,
							);
						}
					}

					for (const field of ['rootDirs', 'typeRoots'] as const) {
						const values = parentCompilerOptions[field];
						if (values) {
							parentCompilerOptions[field] = values.map(value => (
								value.startsWith(configDirPlaceholder)
									? value
									: resolveAndRelativize(directoryPath, extendsDirectoryPath, value)
							));
						}
					}

					rebasedParent.compilerOptions = parentCompilerOptions;
				}

				for (const property of filesProperties) {
					const filesList = rebasedParent[property];
					if (filesList) {
						rebasedParent[property] = filesList.map(file => (
							file.startsWith(configDirPlaceholder)
								? file
								: prefixPattern(directoryPath, extendsDirectoryPath, file)
						));
					}
				}

				const merged = {
					...rebasedParent,
					...config,

					compilerOptions: {
						...rebasedParent.compilerOptions,
						...config.compilerOptions,
					},
				};

				if (rebasedParent.watchOptions) {
					merged.watchOptions = {
						...rebasedParent.watchOptions,
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
		}

		if (config.files) {
			config.files = config.files.map(file => (
				file.startsWith(configDirPlaceholder)
					? file
					: normalizeRelativePath(file)
			));
		}

		if (config.watchOptions) {
			const { watchOptions } = config;

			for (const property of ['excludeDirectories', 'excludeFiles'] as const) {
				if (watchOptions[property]) {
					watchOptions[property] = watchOptions[property].map(
						excludePath => slash(path.resolve(directoryPath, excludePath)),
					);
				}
			}

			for (const property of ['watchFile', 'watchDirectory', 'fallbackPolling'] as const) {
				if (watchOptions[property]) {
					const record = watchOptions as Record<string, string>;
					record[property] = watchOptions[property]!.toLowerCase();
				}
			}
		}

		resolvedCache.set(entryPath, config);
		return config;
	};

	const root = chain[0];
	const resolvedConfig = resolveEntry(root.path);
	const configDir = path.dirname(root.path);

	// Build fresh config for root post-processing — never mutate cached result
	const config: TsconfigJsonResolved = {
		...resolvedConfig,
		compilerOptions: resolvedConfig.compilerOptions
			? { ...resolvedConfig.compilerOptions }
			: {},
	};

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
					return resolvedPath
						? pathRelative(configDir, resolvedPath)
						: normalizeRelativePath(v);
				});
			}
		}

		if (compilerOptions.paths) {
			const paths: Record<string, string[]> = {};
			for (const [name, values] of Object.entries(compilerOptions.paths)) {
				paths[name] = values.map(
					filePath => interpolateConfigDir(filePath, configDir) ?? filePath,
				);
			}
			compilerOptions.paths = paths;
		}

		// Order matters here:
		//   1. configDir interpolation + path normalization (already done above)
		//   2. applyVersionDefaults — injects unconditional defaults for the
		//      target TypeScript version *before* normalize sees the config,
		//      so normalize's derivation rules (e.g. `module ⇒ moduleResolution`)
		//      cascade off the synthesized values.
		//   3. normalizeCompilerOptions — applies version-stable derived
		//      defaults (those internally consistent within a single config).
		// Reversing 2 and 3 would mean version-injected `target` couldn't
		// trigger the `target ⇒ module ⇒ moduleResolution` cascade.
		if (typescriptVersion) {
			applyVersionDefaults(compilerOptions, typescriptVersion);
		}
		config.compilerOptions = normalizeCompilerOptions(compilerOptions);
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
