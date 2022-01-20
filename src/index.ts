import path from 'path';
import {
	sys as tsSys,
	findConfigFile,
	readConfigFile,
	parseJsonConfigFileContent,
} from 'typescript';
import AggregateError from 'aggregate-error';
import { getRaw } from './get-raw';
import type { TsConfigResult } from './types';

const cache = new Map<string, TsConfigResult>();

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

	let parsedConfig;
	if (tsconfigPath) {
		tsconfig = cache.get(tsconfigPath);

		if (tsconfig) {
			return tsconfig;
		}
	
		const configFile = readConfigFile(tsconfigPath, tsSys.readFile);
	
		if (configFile.error?.messageText) {
			throw new Error(configFile.error.messageText.toString());
		}
	
		parsedConfig = parseJsonConfigFileContent(
			configFile.config,
			tsSys,
			path.dirname(tsconfigPath),
		);
	
		if (parsedConfig.errors.length > 0) {
			throw new AggregateError(parsedConfig.errors.map(error => error.messageText));
		}
	}

	const result: TsConfigResult = {
		path: tsconfigPath,
		parsed: parsedConfig,
		getRaw,
	};

	cache.set(searchPath, result);

	if (tsconfigPath && tsconfigPath !== searchPath) {
		cache.set(tsconfigPath, result);
	}

	return result;
}

export default getTsconfig;
