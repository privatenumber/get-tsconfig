import slash from 'slash';
import { findUp } from './utils/find-up.js';
import { parseTsconfig } from './parse-tsconfig/index.js';
import type { TsConfigResult, Cache } from './types.js';

/**
 * Finds a tsconfig file, defaulting to `tsconfig.json`, starting from a given path.
 *
 * @param searchPath Starting directory (default: `process.cwd()`).
 * @param configName Config file name (default: `tsconfig.json`).
 * @param cache Cache for previous results (default: new `Map()`).
 * @returns The tsconfig file path and parsed contents, or `null` if not found.
 */
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
