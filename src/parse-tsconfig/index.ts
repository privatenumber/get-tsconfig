import fs from 'fs';
import path from 'path';
import { parse } from 'jsonc-parser';
import slash from 'slash';
import type { TsConfigJson, TsConfigJsonResolved } from '../types';
import { normalizePath } from '../utils/normalize-path';
import { resolveExtends } from './resolve-extends';

export function parseTsconfig(
	tsconfigPath: string,
): TsConfigJsonResolved {
	let realTsconfigPath: string;
	try {
		realTsconfigPath = fs.realpathSync(tsconfigPath);
	} catch {
		throw new Error(`Cannot resolve tsconfig at path: ${tsconfigPath}`);
	}
	const directoryPath = path.dirname(realTsconfigPath);
	const fileContent = fs.readFileSync(realTsconfigPath, 'utf8').trim();

	let config: TsConfigJson = {};

	if (fileContent) {
		config = parse(fileContent);

		if (!config || typeof config !== 'object') {
			throw new SyntaxError(`Failed to parse tsconfig at: ${tsconfigPath}`);
		}
	}

	if (config.extends) {
		const extendsPath = resolveExtends(
			config.extends,
			directoryPath,
		);

		const extendsConfig = parseTsconfig(extendsPath);

		delete extendsConfig.references;

		if (extendsConfig.compilerOptions?.baseUrl) {
			const { compilerOptions } = extendsConfig;

			compilerOptions.baseUrl = path.relative(
				directoryPath,
				path.join(path.dirname(extendsPath), compilerOptions.baseUrl!),
			) || './';
		}

		if (extendsConfig.files) {
			extendsConfig.files = extendsConfig.files.map(
				file => path.relative(
					directoryPath,
					path.join(path.dirname(extendsPath), file),
				),
			);
		}

		if (extendsConfig.include) {
			extendsConfig.include = extendsConfig.include.map(
				file => path.relative(
					directoryPath,
					path.join(path.dirname(extendsPath), file),
				),
			);
		}

		delete config.extends;

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

	if (config.compilerOptions) {
		const { compilerOptions } = config;

		if (compilerOptions.baseUrl) {
			compilerOptions.baseUrl = normalizePath(compilerOptions.baseUrl);
		}

		if (compilerOptions.outDir) {
			if (!Array.isArray(config.exclude)) {
				config.exclude = [];
			}

			config.exclude.push(compilerOptions.outDir);
			compilerOptions.outDir = normalizePath(compilerOptions.outDir);
		}
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
}
