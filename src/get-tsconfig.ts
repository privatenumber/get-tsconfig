import slash from 'slash';
import { findUp } from './utils/find-up.js';
import { parseTsconfig } from './parse-tsconfig/index.js';
import type { TsConfigResult, Cache } from './types.js';

export const getTsconfig = (
	searchPath = process.cwd(),
	configName = 'tsconfig.json',
	cache: Cache = new Map(),
): TsConfigResult | null => {
	const configFile = findUp(
		slash(searchPath),
		configName,
		cache,
	);

	if (!configFile) {
		return null;
	}

	const config = parseTsconfig(configFile, cache);

	return {
		path: configFile,
		config,
	};
};
