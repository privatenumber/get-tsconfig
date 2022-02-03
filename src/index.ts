import path from 'path';
import {
	sys as tsSys,
	findConfigFile,
	readConfigFile,
	parseJsonConfigFileContent,
	DiagnosticCategory,
} from 'typescript';
import AggregateError from 'aggregate-error';
import type { TsConfigResult } from './types';
import { getRaw } from './get-raw';

const cache = new Map<string, TsConfigResult>();

const errorCodeNoInputFound = 18_003;

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

	let configFile;
	if (tsconfigPath) {
		tsconfig = cache.get(tsconfigPath);

		if (tsconfig) {
			return tsconfig;
		}

		configFile = readConfigFile(tsconfigPath, tsSys.readFile);

		if (configFile.error?.messageText) {
			throw new Error(configFile.error.messageText.toString());
		}
	}

	const parsedConfig = parseJsonConfigFileContent(
		configFile ? configFile.config : {},
		tsSys,
		path.dirname(tsconfigPath || searchPath),
	);

	if (parsedConfig.errors.length > 0) {
		const errors = parsedConfig.errors.filter((error) => {
			if (!tsconfigPath && error.code === errorCodeNoInputFound) {
				return;
			}

			return error.category === DiagnosticCategory.Error;
		});

		if (errors.length > 0) {
			throw new AggregateError(errors.map(error => error.messageText));
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
export type { TsConfigResult };
export type { TsConfigJson } from 'type-fest';
export type { TsConfigExtendsResolved } from './get-raw';
