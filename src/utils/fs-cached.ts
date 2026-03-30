import fs from 'node:fs';
import type { TsconfigCache } from '../types.js';

export const readFile = (
	cache: TsconfigCache<string> | undefined,
	filePath: string,
): string => {
	const cacheKey = `readFileSync:${filePath}`;
	let result = cache?.get(cacheKey);

	if (result === undefined) {
		result = fs.readFileSync(filePath, 'utf8');
		cache?.set(cacheKey, result);
	}

	return result;
};

/**
 * Cached stat that returns undefined on ENOENT instead of throwing.
 * Replaces exists() + stat() pairs with a single syscall.
 */
export const tryStat = (
	cache: TsconfigCache | undefined,
	filePath: string,
): fs.Stats | undefined => {
	const cacheKey = `tryStat:${filePath}`;
	let result = cache?.get(cacheKey) as fs.Stats | null | undefined;

	if (result === undefined) {
		try {
			result = fs.statSync(filePath);
		} catch {
			result = null;
		}
		cache?.set(cacheKey, result);
	}

	return result ?? undefined;
};
