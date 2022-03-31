import path from 'path';
import fs from 'fs';
import slash from 'slash';

export function findConfigFile(
	searchPath: string,
	configName: string,
) {
	while (true) {
		const configPath = path.join(searchPath, configName);
		if (fs.existsSync(configPath)) {
			return slash(configPath);
		}

		const parentPath = path.dirname(searchPath);
		if (parentPath === searchPath) {
			return;
		}

		searchPath = parentPath;
	}
}
