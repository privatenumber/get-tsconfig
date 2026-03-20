import path from 'node:path';
import slash from 'slash';
import type {
	TsconfigJson, TsconfigResult, GetExtendsChainOptions, ReadTsconfigOptions,
} from './types.js';
import { readJsonc } from './utils/read-jsonc.js';
import { resolveExtendsPath } from './resolve-extends-path.js';
import { resolveExtendsChain } from './resolve-extends-chain.js';

/**
 * Collects the extends chain for a tsconfig file.
 *
 * Walks the filesystem to discover all configs in the extends chain,
 * returning them as a flat array with `extends` resolved to absolute paths.
 *
 * @param tsconfigPath - Path to the tsconfig file.
 * @param options - Optional read configuration.
 * @param options.cache - Cache for filesystem reads (default: new `Map()`).
 * @returns Array of `{ path, config }` entries. `chain[0]` is the root config.
 * Ordered root-first, deepest ancestor last.
 * @throws If the file cannot be read, contains non-object JSON, has circular
 * `extends`, or references a missing `extends` target.
 */
export const getExtendsChain = (
	tsconfigPath: string,
	options: GetExtendsChainOptions = {},
): TsconfigResult<TsconfigJson>[] => {
	const { cache = new Map() } = options;
	const resolvedPath = path.resolve(tsconfigPath);
	const chain: TsconfigResult<TsconfigJson>[] = [];
	const visited = new Set<string>();

	const collect = (
		configPath: string,
		circularTracker: Set<string>,
	) => {
		const normalizedPath = slash(configPath);
		if (visited.has(normalizedPath)) {
			return;
		}

		visited.add(normalizedPath);

		let config: TsconfigJson;
		try {
			config = readJsonc(configPath, cache) || {};
		} catch {
			throw new Error(`Cannot resolve tsconfig at path: ${configPath}`);
		}

		if (typeof config !== 'object') {
			throw new SyntaxError(`Failed to parse tsconfig at: ${configPath}`);
		}

		const directoryPath = path.dirname(configPath);

		if (config.extends) {
			const extendsIsArray = Array.isArray(config.extends);
			const extendsList = extendsIsArray
				? config.extends as string[]
				: [config.extends as string];

			const resolvedExtends = extendsList.map((extendsValue) => {
				const resolved = resolveExtendsPath(extendsValue, directoryPath, cache);
				if (!resolved) {
					throw new Error(`File '${extendsValue}' not found.`);
				}

				const resolvedNormalized = slash(resolved);
				if (circularTracker.has(resolvedNormalized) || resolvedNormalized === normalizedPath) {
					throw new Error(`Circularity detected while resolving configuration: ${resolvedNormalized}`);
				}

				return resolvedNormalized;
			});

			config.extends = extendsIsArray
				? resolvedExtends
				: resolvedExtends[0];

			chain.push({
				path: normalizedPath,
				config,
			});

			const nextTracker = new Set(circularTracker);
			nextTracker.add(normalizedPath);

			for (const resolvedExtendsPath of [...resolvedExtends].reverse()) {
				collect(resolvedExtendsPath, nextTracker);
			}
		} else {
			chain.push({
				path: normalizedPath,
				config,
			});
		}
	};

	collect(resolvedPath, new Set());
	return chain;
};

/**
 * Reads and resolves a tsconfig file at a given path
 *
 * @param tsconfigPath - Path to the tsconfig file.
 * @param options - Optional read configuration.
 * @param options.cache - Cache for filesystem reads and resolution results
 * (default: new `Map()`).
 * @returns The resolved absolute path and config.
 * @throws If the file cannot be read, contains invalid JSON, has circular
 * `extends`, or references a missing `extends` target.
 */
export const readTsconfig = (
	tsconfigPath: string,
	options: ReadTsconfigOptions = {},
): TsconfigResult => {
	const { cache = new Map() } = options;
	const chain = getExtendsChain(tsconfigPath, { cache });
	return resolveExtendsChain(chain);
};
