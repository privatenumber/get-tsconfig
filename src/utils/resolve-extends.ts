import path from 'path';
import fs from 'fs';
import { findUp } from './find-up';

const pathExists = (filePath: string) => fs.existsSync(filePath);

const safeJsonParse = (jsonString: string) => {
	try {
		return JSON.parse(jsonString);
	} catch {}
};

export function resolveExtends(
	filePath: string,
	directoryPath: string,
) {
	if (filePath === '..') {
		filePath += '/tsconfig.json';
	}

	// Relative path
	if (filePath.startsWith('.')) {
		let tsconfigPath = path.resolve(directoryPath, filePath);

		if (
			pathExists(tsconfigPath)
			&& fs.statSync(tsconfigPath).isFile()
		) {
			return tsconfigPath;
		}

		if (!tsconfigPath.endsWith('.json')) {
			tsconfigPath += '.json';

			if (pathExists(tsconfigPath)) {
				return tsconfigPath;
			}
		}
	} else {
		let currentPath = findUp(
			directoryPath,
			path.join('node_modules', filePath),
		);

		if (currentPath) {
			if (fs.statSync(currentPath).isDirectory()) {
				const packageJsonpath = path.join(currentPath, 'package.json');

				if (pathExists(packageJsonpath)) {
					const packageJson = safeJsonParse(fs.readFileSync(packageJsonpath, 'utf8'));

					if (packageJson && 'tsconfig' in packageJson) {
						currentPath = path.join(currentPath, packageJson.tsconfig);
					} else {
						currentPath = path.join(currentPath, 'tsconfig.json');
					}
				} else {
					currentPath = path.join(currentPath, 'tsconfig.json');
				}

				if (pathExists(currentPath)) {
					return currentPath;
				}
			} else {
				return currentPath;
			}
		}
	}

	throw new Error(`File '${filePath}' not found.`);
}
