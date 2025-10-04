import path from 'node:path';
import slash from 'slash';
import type { TsConfigJson, TsConfigJsonResolved, Cache } from '../types.js';
import { normalizeRelativePath } from '../utils/normalize-relative-path.js';
import { readJsonc } from '../utils/read-jsonc.js';
import { implicitBaseUrlSymbol, configDirPlaceholder } from '../utils/constants.js';
import { resolveExtendsPath } from './resolve-extends-path.js';

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

const resolveExtends = (
	extendsPath: string,
	fromDirectoryPath: string,
	circularExtendsTracker: Set<string>,
	cache?: Cache<string>,
) => {
	const resolvedExtendsPath = resolveExtendsPath(
		extendsPath,
		fromDirectoryPath,
		cache,
	);

	if (!resolvedExtendsPath) {
		throw new Error(`File '${extendsPath}' not found.`);
	}

	if (circularExtendsTracker.has(resolvedExtendsPath)) {
		throw new Error(`Circularity detected while resolving configuration: ${resolvedExtendsPath}`);
	}

	circularExtendsTracker.add(resolvedExtendsPath);

	const extendsDirectoryPath = path.dirname(resolvedExtendsPath);
	const extendsConfig = _parseTsconfig(resolvedExtendsPath, cache, circularExtendsTracker);
	delete extendsConfig.references;

	const { compilerOptions } = extendsConfig;
	if (compilerOptions) {
		const { baseUrl } = compilerOptions;
		if (baseUrl && !baseUrl.startsWith(configDirPlaceholder)) {
			compilerOptions.baseUrl = resolveAndRelativize(
				fromDirectoryPath,
				extendsDirectoryPath,
				baseUrl,
			);
		}

		const { outDir } = compilerOptions;
		if (outDir && !outDir.startsWith(configDirPlaceholder)) {
			compilerOptions.outDir = resolveAndRelativize(
				fromDirectoryPath,
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

				return prefixPattern(fromDirectoryPath, extendsDirectoryPath, file);
			});
		}
	}

	return extendsConfig;
};

const outputFields = [
	'outDir',
	'declarationDir',
] as const;

const _parseTsconfig = (
	tsconfigPath: string,
	cache?: Cache<string>,
	circularExtendsTracker = new Set<string>(),
): TsConfigJsonResolved => {
	/**
	 * Decided not to cache the TsConfigJsonResolved object because it's
	 * mutable.
	 *
	 * Note how `resolveExtends` can call `parseTsconfig` rescursively
	 * and actually mutates the object. It can also be mutated in
	 * user-land.
	 *
	 * By only caching fs results, we can avoid serving mutated objects
	 */
	let config: TsConfigJson;
	try {
		config = readJsonc(tsconfigPath, cache) || {};
	} catch {
		throw new Error(`Cannot resolve tsconfig at path: ${tsconfigPath}`);
	}

	if (typeof config !== 'object') {
		throw new SyntaxError(`Failed to parse tsconfig at: ${tsconfigPath}`);
	}

	const directoryPath = path.dirname(tsconfigPath);

	if (config.compilerOptions) {
		const { compilerOptions } = config;
		if (
			compilerOptions.paths
			&& !compilerOptions.baseUrl
		) {
			type WithImplicitBaseUrl = TsConfigJson.CompilerOptions & {
				[implicitBaseUrlSymbol]: string;
			};
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
			const extendsConfig = resolveExtends(
				extendsPath,
				directoryPath,
				new Set(circularExtendsTracker),
				cache,
			);
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
					config.exclude = [];
				}

				if (!config.exclude.includes(outputPath)) {
					config.exclude.push(outputPath);
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
	}

	return config;
};

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

const normalizeCompilerOptions = (
	compilerOptions: TsConfigJson.CompilerOptions,
) => {
	if (compilerOptions.strict) {
		const strictOptions = [
			'noImplicitAny',
			'noImplicitThis',
			'strictNullChecks',
			'strictFunctionTypes',
			'strictBindCallApply',
			'strictPropertyInitialization',
			'strictBuiltinIteratorReturn',
			'alwaysStrict',
			'useUnknownInCatchVariables',
		] as const;

		for (const key of strictOptions) {
			if (compilerOptions[key] === undefined) {
				compilerOptions[key] = true;
			}
		}
	}

	if (compilerOptions.target) {
		let target = compilerOptions.target.toLowerCase() as TsConfigJson.CompilerOptions.Target;

		if (target === 'es2015') {
			target = 'es6';
		}

		// Lower case
		compilerOptions.target = target;

		if (target === 'esnext') {
			compilerOptions.module ??= 'es6';
			compilerOptions.useDefineForClassFields ??= true;
		}

		if (
			target === 'es6'
			|| target === 'es2016'
			|| target === 'es2017'
			|| target === 'es2018'
			|| target === 'es2019'
			|| target === 'es2020'
			|| target === 'es2021'
			|| target === 'es2022'
			|| target === 'es2023'
			|| target === 'es2024'
		) {
			compilerOptions.module ??= 'es6';
		}

		if (
			target === 'es2022'
			|| target === 'es2023'
			|| target === 'es2024'
		) {
			compilerOptions.useDefineForClassFields ??= true;
		}
	}

	if (compilerOptions.module) {
		let module = compilerOptions.module.toLowerCase() as TsConfigJson.CompilerOptions.Module;

		if (module === 'es2015') {
			module = 'es6';
		}

		compilerOptions.module = module;

		if (
			module === 'es6'
			|| module === 'es2020'
			|| module === 'es2022'
			|| module === 'esnext'
			|| module === 'none'
			|| module === 'system'
			|| module === 'umd'
			|| module === 'amd'
		) {
			compilerOptions.moduleResolution ??= 'classic';
		}

		if (module === 'system') {
			compilerOptions.allowSyntheticDefaultImports ??= true;
		}

		if (
			module === 'node16'
			|| module === 'nodenext'
			|| module === 'preserve'
		) {
			compilerOptions.esModuleInterop ??= true;
			compilerOptions.allowSyntheticDefaultImports ??= true;
		}

		if (
			module === 'node16'
			|| module === 'nodenext'
		) {
			compilerOptions.moduleDetection ??= 'force';
			compilerOptions.useDefineForClassFields ??= true;
		}

		if (module === 'node16') {
			compilerOptions.target ??= 'es2022';
			compilerOptions.moduleResolution ??= 'node16';
		}

		if (module === 'nodenext') {
			compilerOptions.target ??= 'esnext';
			compilerOptions.moduleResolution ??= 'nodenext';
		}

		if (module === 'preserve') {
			compilerOptions.moduleResolution ??= 'bundler';
		}
	}

	if (compilerOptions.moduleResolution) {
		let moduleResolution = compilerOptions.moduleResolution.toLowerCase() as
				TsConfigJson.CompilerOptions.ModuleResolution;

		if (moduleResolution === 'node') {
			moduleResolution = 'node10';
		}

		compilerOptions.moduleResolution = moduleResolution;

		if (
			moduleResolution === 'node16'
			|| moduleResolution === 'nodenext'
			|| moduleResolution === 'bundler'
		) {
			compilerOptions.resolvePackageJsonExports ??= true;
			compilerOptions.resolvePackageJsonImports ??= true;
		}

		if (moduleResolution === 'bundler') {
			compilerOptions.allowSyntheticDefaultImports ??= true;
			compilerOptions.resolveJsonModule ??= true;
		}
	}

	if (compilerOptions.esModuleInterop) {
		compilerOptions.allowSyntheticDefaultImports ??= true;
	}

	if (compilerOptions.verbatimModuleSyntax) {
		compilerOptions.isolatedModules ??= true;
		compilerOptions.preserveConstEnums ??= true;
	}

	if (compilerOptions.isolatedModules) {
		compilerOptions.preserveConstEnums ??= true;
	}
};

/**
 * Parses a tsconfig file at a given path
 *
 * @param tsconfigPath - Path to the tsconfig file.
 * @param cache - Cache for storing parsed tsconfig results (default: new `Map()`).
 * @returns The parsed and resolved tsconfig JSON.
 */
export const parseTsconfig = (
	tsconfigPath: string,
	cache: Cache<string> = new Map(),
): TsConfigJsonResolved => {
	const resolvedTsconfigPath = path.resolve(tsconfigPath);
	const config = _parseTsconfig(resolvedTsconfigPath, cache);
	const configDir = path.dirname(resolvedTsconfigPath);

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

	return config;
};
