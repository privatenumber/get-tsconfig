import fs from 'fs';
import path from 'path';
import { parse } from 'jsonc-parser';
import slash from 'slash';
import { findUp } from './find-up';
import type { TsConfigJson, TsConfigJsonResolved } from '../types';
import { normalizePath } from './normalize-path';

const pathExists = (filePath: string) => fs.existsSync(filePath);

const safeJsonParse = (jsonString: string) => {
	try {
		return JSON.parse(jsonString);
	} catch {}
};

function resolveExtends(
	filePath: string,
	directoryPath: string,	
) {
	if (filePath === '..') {
		filePath += '/tsconfig.json';
	}

	// Relative path
	if (filePath.startsWith('.')) {
		let tsconfigPath = path.resolve(directoryPath, filePath);

		if (
			pathExists(tsconfigPath)
			&& fs.statSync(tsconfigPath).isFile()
		) {
			return tsconfigPath;
		}

		if (!tsconfigPath.endsWith('.json')) {
			tsconfigPath += '.json';

			if (pathExists(tsconfigPath)) {
				return tsconfigPath;
			}
		}
	} else {
		const nodeModulePath = path.join('node_modules', filePath);	
		let currentPath = findUp(
			directoryPath,
			nodeModulePath,
		);

		if (currentPath) {
			if (fs.statSync(currentPath).isDirectory()) {
				const packageJsonpath = path.join(currentPath, 'package.json');
	
				if (pathExists(packageJsonpath)) {
					const packageJsonContent = fs.readFileSync(packageJsonpath, 'utf8');
					const packageJson = safeJsonParse(packageJsonContent);
	
					if (packageJson && 'tsconfig' in packageJson) {
						currentPath = path.join(currentPath, packageJson.tsconfig);
					} else {
						currentPath = path.join(currentPath, 'tsconfig.json');
					}
				} else {
					currentPath = path.join(currentPath, 'tsconfig.json');
				}
	
				if (pathExists(currentPath)) {
					return currentPath;
				}
			} else {
				return currentPath;
			}
		}
	}

	throw new Error(`File '${filePath}' not found.`);
}

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
		const extendsPath = resolveExtends(
			config.extends,
			directoryPath,
		);

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
