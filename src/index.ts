import fs from 'fs';
import path from 'path';
import type { TsConfigJson, TsConfigJsonResolved } from './types';

const normalizePath = (filePath: string) => (
	/^[./]/.test(filePath)
		? filePath
		: `./${filePath}`
);

function findConfigFile(
	searchPath: string,
	configName: string,
) {
	while (true) {
		const configPath = path.join(searchPath, configName);
		if (fs.existsSync(configPath)) {
			return configPath;
		}

		const parentPath = path.dirname(searchPath);
		if (parentPath === searchPath) {
			return;
		}

		searchPath = parentPath;
	}
}

/**
 * Use indirect eval for compilers:
 * https://esbuild.github.io/content-types/#direct-eval
 *
 * eval is considered a security risk in the frontend.
 * In Node.js, dependencies can run potentially malicious
 * code even without eval.
 */
// eslint-disable-next-line no-eval
const indirectEval = eval;

const safeEval = (expression: string) => {
	return indirectEval(`
		const emptyGlobal = new Proxy({}, {
			has: () => true,
		});
		with (emptyGlobal) {
			(${expression}\n)
		}
	`);
};

function readConfigFile(
	filePath: string,
): TsConfigJsonResolved {
	const fileRealPath = fs.realpathSync(filePath);
	const directoryPath = path.dirname(fileRealPath);
	const fileContent = fs.readFileSync(filePath, 'utf-8').trim();

	// TODO add error
	let config: TsConfigJson = {};

	if (fileContent) {
		try {
			config = safeEval(fileContent);
		} catch {
			throw new SyntaxError('Failed to parse JSON: ' + filePath);
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

		const extendsConfig = readConfigFile(extendsPath);

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

	if (config.watchOptions) {
		const { watchOptions } = config;

		if (watchOptions.excludeDirectories) {
			watchOptions.excludeDirectories = watchOptions.excludeDirectories.map(
				excludePath => path.resolve(directoryPath, excludePath),
			);
		}
	}

	return config;
}

function getTsconfig(
	searchPath = process.cwd(),
	configName = 'tsconfig.json',
) {
	const configFile = findConfigFile(searchPath, configName);

	if (!configFile) {
		return null;
	}

	const config = readConfigFile(configFile);

	return {
		path: configFile,
		config,
	};
}

export default getTsconfig;
export * from './types';
