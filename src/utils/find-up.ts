import path from 'path';
import { exists } from './fs-cached.js';

export const findUp = (
	searchPath: string,
	fileName: string,
	cache?: Map<string, any>,
) => {
	while (true) {
		const configPath = path.posix.join(searchPath, fileName);
		if (exists(cache, configPath)) {
			return configPath;
		}

		const parentPath = path.dirname(searchPath);
		if (parentPath === searchPath) {
			return;
		}

		searchPath = parentPath;
	}
};
