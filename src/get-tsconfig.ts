import slash from 'slash';
import { findUp } from './utils/find-up.js';
import { parseTsconfig } from './parse-tsconfig/index.js';
import type { TsConfigResult, Cache } from './types.js';

/**
 * Searches for a tsconfig file by walking up the directory tree.
 *
 * @param searchPath Starting directory (default: `process.cwd()`).
 * @param configName Config file name (default: `tsconfig.json`).
 * @param cache Cache for previous results (default: new `Map()`).
 * @returns The path to the found tsconfig file, or `undefined` if not found.
 */
export const findTsconfig = (
	searchPath = process.cwd(),
	configName = 'tsconfig.json',
	cache: Cache = new Map(),
): string | undefined => findUp(
	slash(searchPath),
	configName,
	cache,
);

/**
 * Finds and reads a tsconfig file by walking up the directory tree.
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
	const configFile = findTsconfig(searchPath, configName, cache);

	if (!configFile) {
		return null;
	}

	const config = parseTsconfig(configFile, cache);

	return {
		path: configFile,
		config,
	};
};
