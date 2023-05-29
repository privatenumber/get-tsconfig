import path from 'path';
import fs from 'fs';

export const findUp = (
	searchPath: string,
	fileName: string,
) => {
	while (true) {
		const configPath = path.posix.join(searchPath, fileName);
		if (fs.existsSync(configPath)) {
			return configPath;
		}

		const parentPath = path.dirname(searchPath);
		if (parentPath === searchPath) {
			return;
		}

		searchPath = parentPath;
	}
}
