import fs from 'fs';
import path from 'path';
import slash from 'slash';
import type { TsConfigJson, TsConfigJsonResolved } from '../types.js';
import { normalizePath } from '../utils/normalize-path.js';
import { readJsonc } from '../utils/read-jsonc.js';
import { resolveExtendsPath } from './resolve-extends-path.js';

const resolveExtends = (
	extendsPath: string,
	directoryPath: string,
) => {
	const resolvedExtendsPath = resolveExtendsPath(
		extendsPath,
		directoryPath,
	);

	if (!resolvedExtendsPath) {
		throw new Error(`File '${extendsPath}' not found.`);
	}

	const extendsConfig = parseTsconfig(resolvedExtendsPath);
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
): TsConfigJsonResolved => {
	let realTsconfigPath: string;
	try {
		realTsconfigPath = fs.realpathSync(tsconfigPath);
	} catch {
		throw new Error(`Cannot resolve tsconfig at path: ${tsconfigPath}`);
	}
	const directoryPath = path.dirname(realTsconfigPath);
	let config: TsConfigJson = readJsonc(realTsconfigPath) || {};

	if (typeof config !== 'object') {
		throw new SyntaxError(`Failed to parse tsconfig at: ${tsconfigPath}`);
	}

	if (config.extends) {
		const extendsPathList = (
			Array.isArray(config.extends)
				? config.extends
				: [config.extends]
		);

		delete config.extends;

		for (const extendsPath of extendsPathList.reverse()) {
			const extendsConfig = resolveExtends(extendsPath, directoryPath);
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
			console.log({
				directoryPath,
				baseUrl: compilerOptions.baseUrl,
				resolvedBaseUrl,
				relativeBaseUrl,
			});

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
