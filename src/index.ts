import path from 'path';
import {
	sys as tsSys,
	findConfigFile,
	readConfigFile,
	parseJsonConfigFileContent,
} from 'typescript';
import type { CompilerOptions } from 'typescript';
import AggregateError from 'aggregate-error';

type TsConfig = {
	compilerOptions: CompilerOptions;
};

const cache = new Map<string, TsConfig>();

/**
 * If a JSON file is passed in, it will parse that as tsconfig
 * If a non JSON file (directory or TS file) is passed in, it searches up for a tsconfig from there
 */
function getTsconfig(
	searchPath = process.cwd(),
) {
	let tsconfig = cache.get(searchPath);

	if (tsconfig) {
		return tsconfig;
	}

	const tsconfigPath = (
		searchPath.endsWith('.json')
			? searchPath
			: findConfigFile(searchPath, tsSys.fileExists, 'tsconfig.json')
	);

	if (!tsconfigPath) {
		throw new Error('Could not find a tsconfig.json file.');
	}

	const configFile = readConfigFile(tsconfigPath, tsSys.readFile);

	if (configFile.error?.messageText) {
		throw new Error(configFile.error.messageText.toString());
	}

	const parsedConfig = parseJsonConfigFileContent(
		configFile.config,
		tsSys,
		path.dirname(tsconfigPath),
	);

	if (parsedConfig.errors.length > 0) {
		throw new AggregateError(parsedConfig.errors.map(error => error.messageText));
	}

	tsconfig = {
		compilerOptions: parsedConfig.options,
	};

	cache.set(searchPath, tsconfig);

	return tsconfig;
}

export = getTsconfig;
