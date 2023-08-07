import path from 'path';
import slash from 'slash';
import type { TsConfigJson, TsConfigJsonResolved } from '../types.js';
import { normalizePath } from '../utils/normalize-path.js';
import { readJsonc } from '../utils/read-jsonc.js';
import { realpath } from '../utils/fs-cached.js';
import { resolveExtendsPath } from './resolve-extends-path.js';

const resolveExtends = (
	extendsPath: string,
	directoryPath: string,
	cache?: Map<string, any>,
) => {
	const resolvedExtendsPath = resolveExtendsPath(
		extendsPath,
		directoryPath,
		cache,
	);

	if (!resolvedExtendsPath) {
		throw new Error(`File '${extendsPath}' not found.`);
	}

	const extendsConfig = parseTsconfig(resolvedExtendsPath, cache);
	delete extendsConfig.references;

	if (extendsConfig.compilerOptions?.baseUrl) {
		const { compilerOptions } = extendsConfig;

		compilerOptions.baseUrl = path.relative(
			directoryPath,
			path.join(path.dirname(resolvedExtendsPath), compilerOptions.baseUrl!),
		) || './';
	}

	if (extendsConfig.files) {
		extendsConfig.files = extendsConfig.files.map(
			file => path.relative(
				directoryPath,
				path.join(path.dirname(resolvedExtendsPath), file),
			),
		);
	}

	if (extendsConfig.include) {
		extendsConfig.include = extendsConfig.include.map(
			file => path.relative(
				directoryPath,
				path.join(path.dirname(resolvedExtendsPath), file),
			),
		);
	}

	return extendsConfig;
};

export const parseTsconfig = (
	tsconfigPath: string,
	cache: Map<string, any> = new Map(),
): TsConfigJsonResolved => {
	let realTsconfigPath: string;
	try {
		realTsconfigPath = realpath(cache, tsconfigPath) as string;
	} catch {
		throw new Error(`Cannot resolve tsconfig at path: ${tsconfigPath}`);
	}

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
	let config: TsConfigJson = readJsonc(realTsconfigPath, cache) || {};

	if (typeof config !== 'object') {
		throw new SyntaxError(`Failed to parse tsconfig at: ${tsconfigPath}`);
	}

	const directoryPath = path.dirname(realTsconfigPath);
	if (config.extends) {
		const extendsPathList = (
			Array.isArray(config.extends)
				? config.extends
				: [config.extends]
		);

		delete config.extends;

		for (const extendsPath of extendsPathList.reverse()) {
			const extendsConfig = resolveExtends(extendsPath, directoryPath, cache);
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

		if (compilerOptions.baseUrl) {
			const resolvedBaseUrl = path.resolve(directoryPath, compilerOptions.baseUrl);
			const relativeBaseUrl = normalizePath(path.relative(
				directoryPath,
				resolvedBaseUrl,
			));
			compilerOptions.baseUrl = relativeBaseUrl;
		}

		if (compilerOptions.outDir) {
			if (!Array.isArray(config.exclude)) {
				config.exclude = [];
			}

			config.exclude.push(compilerOptions.outDir);
			compilerOptions.outDir = normalizePath(compilerOptions.outDir);
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
