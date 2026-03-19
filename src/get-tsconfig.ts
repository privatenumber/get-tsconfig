import path from 'node:path';
import slash from 'slash';
import { findUp } from './utils/find-up.js';
import { tryStat } from './utils/fs-cached.js';
import { readTsconfig } from './read-tsconfig/index.js';
import { isFileIncluded } from './files-matcher.js';
import type {
	TsconfigResult, TsconfigCache, FindTsconfigOptions, GetTsconfigOptions,
} from './types.js';

const findConfigApplicable = (
	searchPath: string,
	configName: string,
	cache: TsconfigCache,
) => {
	const resolvedFilePath = path.resolve(searchPath);
	let currentPath = slash(searchPath);

	while (true) {
		const configFile = findUp(currentPath, configName, cache);
		if (!configFile) {
			return;
		}

		const absoluteConfigFile = path.resolve(configFile);
		const result = readTsconfig(absoluteConfigFile, { cache });
		if (isFileIncluded(result, resolvedFilePath)) {
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
 * @param options Optional search configuration.
 * @param options.configName Config file name (default: `tsconfig.json`).
 * @param options.cache Cache for previous results (default: new `Map()`).
 * @param options.includes When true, validates that the tsconfig applies to the
 * `searchPath` file via `include`/`exclude`/`files`. See {@link getTsconfig}
 * for details. Default: `false`.
 * @returns The path to the found tsconfig file, or `undefined` if not found.
 */
export const findTsconfig = (
	searchPath = process.cwd(),
	options: FindTsconfigOptions = {},
): string | undefined => {
	const {
		configName = 'tsconfig.json',
		cache = new Map() as TsconfigCache,
		includes = false,
	} = options;

	if (!includes) {
		// Avoid probing "<config>/tsconfig.json" when searchPath already is the config file.
		const resolvedSearchPath = path.resolve(searchPath);
		if (
			path.basename(resolvedSearchPath) === configName
			&& tryStat(cache, resolvedSearchPath)?.isFile()
		) {
			return slash(resolvedSearchPath);
		}

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
 * @param options Optional search configuration.
 * @param options.configName Config file name (default: `tsconfig.json`).
 * @param options.cache Cache for previous results (default: new `Map()`).
 * @param options.includes When true, validates that the tsconfig applies to the
 * `searchPath` file via `include`/`exclude`/`files`. Default: `false`.
 * @returns The tsconfig file path and parsed contents, or `undefined` if not found.
 */
export const getTsconfig = (
	searchPath = process.cwd(),
	options: GetTsconfigOptions = {},
): TsconfigResult | undefined => {
	const {
		configName = 'tsconfig.json',
		cache = new Map(),
		includes = false,
	} = options;

	if (!includes) {
		const configFile = findTsconfig(searchPath, {
			configName,
			cache,
		});
		if (!configFile) {
			return;
		}

		return readTsconfig(configFile, { cache });
	}

	return findConfigApplicable(searchPath, configName, cache);
};
