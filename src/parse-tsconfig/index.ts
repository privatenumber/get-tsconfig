import path from 'path';
import slash from 'slash';
import type { TsConfigJson, TsConfigJsonResolved, Cache } from '../types.js';
import { normalizePath } from '../utils/normalize-path.js';
import { readJsonc } from '../utils/read-jsonc.js';
import { implicitBaseUrlSymbol } from '../utils/symbols.js';
import { resolveExtendsPath } from './resolve-extends-path.js';

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
		const resolvePaths = ['baseUrl', 'outDir'] as const;
		for (const property of resolvePaths) {
			const unresolvedPath = compilerOptions[property];
			if (unresolvedPath) {
				compilerOptions[property] = slash(path.relative(
					fromDirectoryPath,
					path.join(extendsDirectoryPath, unresolvedPath),
				)) || './';
			}
		}
	}

	if (extendsConfig.files) {
		extendsConfig.files = extendsConfig.files.map(
			file => slash(path.relative(
				fromDirectoryPath,
				path.join(extendsDirectoryPath, file),
			)),
		);
	}

	if (extendsConfig.include) {
		extendsConfig.include = extendsConfig.include.map(
			file => slash(path.relative(
				fromDirectoryPath,
				path.join(extendsDirectoryPath, file),
			)),
		);
	}

	if (extendsConfig.exclude) {
		extendsConfig.exclude = extendsConfig.exclude.map(
			file => slash(path.relative(
				fromDirectoryPath,
				path.join(extendsDirectoryPath, file),
			)),
		);
	}

	return extendsConfig;
};

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
			if (unresolvedPath) {
				const resolvedBaseUrl = path.resolve(directoryPath, unresolvedPath);
				const relativeBaseUrl = normalizePath(path.relative(
					directoryPath,
					resolvedBaseUrl,
				));
				compilerOptions[property] = relativeBaseUrl;
			}
		}

		const { outDir } = compilerOptions;
		if (outDir) {
			if (!Array.isArray(config.exclude)) {
				config.exclude = [];
			}

			if (!config.exclude.includes(outDir)) {
				config.exclude.push(outDir);
			}
			compilerOptions.outDir = normalizePath(outDir);
		}
	} else {
		config.compilerOptions = {};
	}

	if (config.files) {
		config.files = config.files.map(normalizePath);
	}

	if (config.include) {
		config.include = config.include.map(slash);
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

export const parseTsconfig = (
	tsconfigPath: string,
	cache: Cache<string> = new Map(),
): TsConfigJsonResolved => _parseTsconfig(tsconfigPath, cache);
