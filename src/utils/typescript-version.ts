import path from 'node:path';
import type { TsconfigCache } from '../types.js';
import { findUp } from './find-up.js';
import { readJsonc } from './read-jsonc.js';
import { getPnpApi } from './pnp.js';

const cacheKeyPrefix = 'detectTypeScriptVersion:';

/**
 * Resolves the version of TypeScript installed near `directoryPath` by
 * locating its `package.json` and returning the `version` field.
 *
 * Resolution order matches what `tsc` would see when invoked from
 * `directoryPath`:
 *
 * 1. **Yarn Berry pnp** — if running under pnp, ask the API to resolve
 *    `typescript/package.json` against `directoryPath`.
 * 2. **node_modules walk-up** — `findUp` for
 *    `node_modules/typescript/package.json` from `directoryPath` toward
 *    the filesystem root.
 *
 * Behaviour notes (verified):
 * - **pnpm**: `node_modules/typescript` is a symlink into `.pnpm/...`;
 *   the underlying `statSync`/`readFileSync` calls follow the symlink
 *   transparently, so we read the real `package.json`.
 * - **Malformed `package.json`** (invalid JSON or non-string `version`):
 *   we return `undefined` rather than continuing the walk. A broken
 *   typescript install would also break `tsc` itself, so silently
 *   walking past it would mask a real problem.
 *
 * The version string is cached at `directoryPath` granularity. Repeat
 * calls are O(1). The underlying `tryStat`/`readFile` caches dedupe across
 * sibling directories that share parents.
 */
export const detectTypeScriptVersion = (
	directoryPath: string,
	cache?: TsconfigCache,
): string | undefined => {
	const cacheKey = `${cacheKeyPrefix}${directoryPath}`;
	const cached = cache?.get(cacheKey) as string | null | undefined;
	if (cached !== undefined) {
		return cached ?? undefined;
	}

	let packageJsonPath: string | undefined;
	const pnpApi = getPnpApi();
	if (pnpApi) {
		try {
			// resolveRequest returns string | null; coerce to string | undefined.
			packageJsonPath = pnpApi.resolveRequest(
				'typescript/package.json',
				directoryPath,
			) ?? undefined;
		} catch {
			// pnp couldn't resolve — fall through to node_modules walk
		}
	}

	packageJsonPath ??= findUp(
		path.resolve(directoryPath),
		path.join('node_modules', 'typescript', 'package.json'),
		cache,
	);

	let version: string | undefined;
	if (packageJsonPath) {
		try {
			const parsed = readJsonc(packageJsonPath, cache) as { version?: string } | undefined;
			if (typeof parsed?.version === 'string') {
				version = parsed.version;
			}
		} catch {
			// malformed JSON — treat as "not found"
		}
	}

	cache?.set(cacheKey, version ?? null);
	return version;
};
