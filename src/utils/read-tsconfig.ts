import fs from 'fs';
import path from 'path';
import { parse } from 'jsonc-parser';
import slash from 'slash';
import type { TsConfigJson, TsConfigJsonResolved } from '../types';
import { normalizePath } from './normalize-path';

export function readTsconfig(
	filePath: string,
): TsConfigJsonResolved {
	const fileRealPath = fs.realpathSync(filePath);
	const directoryPath = path.dirname(fileRealPath);
	const fileContent = fs.readFileSync(filePath, 'utf8').trim();

	let config: TsConfigJson = {};

	if (fileContent) {
		config = parse(fileContent);

		if (!config || typeof config !== 'object') {
			throw new SyntaxError(`Failed to parse JSON: ${filePath}`);
		}
	}

	if (config.extends) {
		let extendsPath = config.extends;

		try {
			extendsPath = require.resolve(extendsPath, { paths: [path.dirname(filePath)] });
		} catch (error) {
			if ((error as any).code === 'MODULE_NOT_FOUND') {
				try {
					extendsPath = require.resolve(
						path.join(extendsPath, 'tsconfig.json'),
						{ paths: [path.dirname(filePath)] },
					);
				} catch {}
			}
		}

		const extendsConfig = readTsconfig(extendsPath);

		delete extendsConfig.references;

		if (extendsConfig.compilerOptions?.baseUrl) {
			const { compilerOptions } = extendsConfig;

			compilerOptions.baseUrl = path.relative(
				directoryPath,
				path.join(path.dirname(extendsPath), compilerOptions.baseUrl!),
			);
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

	if (config.compilerOptions?.baseUrl) {
		const { compilerOptions } = config;

		compilerOptions.baseUrl = normalizePath(compilerOptions.baseUrl!);
	}

	if (config.files) {
		config.files = config.files.map(normalizePath);
	}

	if (config.include) {
		config.include = config.include.map(normalizePath);
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
