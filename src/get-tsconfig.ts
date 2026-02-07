import path from 'node:path';
import slash from 'slash';
import { findUp } from './utils/find-up.js';
import { parseTsconfig } from './parse-tsconfig/index.js';
import { createFilesMatcher } from './files-matcher.js';
import type { TsConfigResult, Cache } from './types.js';

const findConfigApplicable = (
	searchPath: string,
	configName: string,
	cache: Cache,
) => {
	const resolvedFilePath = path.resolve(searchPath);
	let currentPath = slash(searchPath);

	while (true) {
		const configFile = findUp(currentPath, configName, cache);
		if (!configFile) {
			return;
		}

		const absoluteConfigFile = path.resolve(configFile);
		const config = parseTsconfig(absoluteConfigFile, cache);
		const result: TsConfigResult = {
			path: slash(absoluteConfigFile),
			config,
		};

		const matcher = createFilesMatcher(result);
		if (matcher(resolvedFilePath)) {
			return result;
		}

		const configDirectory = path.dirname(configFile);
		const parentDirectory = path.dirname(configDirectory);
		if (parentDirectory === configDirectory) {
			return;
		}

		currentPath = parentDirectory;
	}
};

/**
 * Searches for a tsconfig file by walking up the directory tree.
 *
 * @param searchPath Path to a source file or directory to search from (default: `process.cwd()`).
 * @param configName Config file name (default: `tsconfig.json`).
 * @param cache Cache for previous results (default: new `Map()`).
 * @param includes When true, validates that the tsconfig applies to the
 * `searchPath` file via `include`/`exclude`/`files`. See {@link getTsconfig}
 * for details. Default: `false`.
 * @returns The path to the found tsconfig file, or `undefined` if not found.
 */
export const findTsconfig = (
	searchPath = process.cwd(),
	configName = 'tsconfig.json',
	cache: Cache = new Map(),
	includes = false,
): string | undefined => {
	if (!includes) {
		return findUp(
			slash(searchPath),
			configName,
			cache,
		);
	}

	return findConfigApplicable(searchPath, configName, cache)?.path;
};

/**
 * Finds and reads a tsconfig file by walking up the directory tree.
 *
 * By default, returns the nearest tsconfig found (matching `tsc` CLI behavior).
 *
 * When `includes` is true and `searchPath` is a file path, validates
 * that the found tsconfig applies to the file (via `files`, `include`, and
 * `exclude`). If the file isn't matched, continues searching parent directories.
 * This matches VS Code's TypeScript Language Server behavior.
 *
 * Reference:
 * - `tsc` CLI uses `findConfigFile()` which returns the nearest tsconfig without validation:
 *   https://github.com/microsoft/TypeScript/blob/b19a9da2a3b8/src/compiler/program.ts#L328
 * - Language Server uses `isMatchedByConfig()` to verify the file belongs to the project:
 *   https://github.com/microsoft/TypeScript/blob/b19a9da2a3b8/src/server/editorServices.ts#L4486
 *
 * @param searchPath Path to a source file or directory to search from (default: `process.cwd()`).
 * @param configName Config file name (default: `tsconfig.json`).
 * @param cache Cache for previous results (default: new `Map()`).
 * @param includes When true, validates that the tsconfig applies to the
 * `searchPath` file via `include`/`exclude`/`files`. Default: `false`.
 * @returns The tsconfig file path and parsed contents, or `null` if not found.
 */
export const getTsconfig = (
	searchPath = process.cwd(),
	configName = 'tsconfig.json',
	cache: Cache = new Map(),
	includes = false,
): TsConfigResult | null => {
	if (!includes) {
		const configFile = findTsconfig(searchPath, configName, cache);
		if (!configFile) {
			return null;
		}

		const config = parseTsconfig(configFile, cache);
		return {
			path: configFile,
			config,
		};
	}

	return findConfigApplicable(searchPath, configName, cache) ?? null;
};
