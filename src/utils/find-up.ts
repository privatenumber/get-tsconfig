import path from 'node:path';
import type { Cache } from '../types.js';
import { tryStat } from './fs-cached.js';

export const findUp = (
	searchPath: string,
	fileName: string,
	cache?: Cache,
) => {
	while (true) {
		const configPath = path.posix.join(searchPath, fileName);
		if (tryStat(cache, configPath)) {
			return configPath;
		}

		const parentPath = path.dirname(searchPath);
		if (parentPath === searchPath) {
			return;
		}

		searchPath = parentPath;
	}
};
