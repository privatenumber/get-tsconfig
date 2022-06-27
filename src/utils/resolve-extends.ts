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
	let currentFilePath = filePath;

	if (currentFilePath === '..') {
		currentFilePath += '/tsconfig.json';
	}

	// Relative path
	if (currentFilePath.startsWith('.')) {
		let tsconfigPath = path.resolve(directoryPath, currentFilePath);

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
		let packagePath = findUp(
			directoryPath,
			path.join('node_modules', currentFilePath),
		);

		if (packagePath) {
			if (fs.statSync(packagePath).isDirectory()) {
				const packageJsonpath = path.join(packagePath, 'package.json');

				if (pathExists(packageJsonpath)) {
					const packageJson = safeJsonParse(fs.readFileSync(packageJsonpath, 'utf8'));

					if (packageJson && 'tsconfig' in packageJson) {
						packagePath = path.join(packagePath, packageJson.tsconfig);
					} else {
						packagePath = path.join(packagePath, 'tsconfig.json');
					}
				} else {
					packagePath = path.join(packagePath, 'tsconfig.json');
				}

				if (pathExists(packagePath)) {
					return packagePath;
				}
			} else if (packagePath.endsWith('.json')) {
				return packagePath;
			}
		}

		if (!currentFilePath.endsWith('.json')) {
			currentFilePath += '.json';

			packagePath = findUp(
				directoryPath,
				path.join('node_modules', currentFilePath),
			);

			if (packagePath) {
				return packagePath;
			}
		}
	}

	throw new Error(`File '${filePath}' not found.`);
}
