import path from 'path';
import fs from 'fs';
import Module from 'module';
import { findUp } from '../utils/find-up';
import { readJsonc } from '../utils/read-jsonc';

const { existsSync } = fs;

const getPnpApi = () => {
	const { findPnpApi } = Module;

	// https://yarnpkg.com/advanced/pnpapi/#requirepnpapi
	return findPnpApi && findPnpApi(process.cwd());
};

function resolveFromPackageJsonPath(packageJsonPath: string) {
	const packageJson = readJsonc(packageJsonPath);

	return path.join(
		packageJsonPath,
		'..',
		(packageJson && 'tsconfig' in packageJson)
			? packageJson.tsconfig
			: 'tsconfig.json',
	);
}

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
			existsSync(tsconfigPath)
			&& fs.statSync(tsconfigPath).isFile()
		) {
			return tsconfigPath;
		}

		if (!tsconfigPath.endsWith('.json')) {
			tsconfigPath += '.json';

			if (existsSync(tsconfigPath)) {
				return tsconfigPath;
			}
		}

		throw new Error(`File '${filePath}' not found.`);
	}

	const pnpApi = getPnpApi();
	if (pnpApi) {
		const { resolveRequest } = pnpApi;
		const [first, second] = filePath.split('/');
		const packageName = first.startsWith('@') ? `${first}/${second}` : first;

		try {
			if (packageName === filePath) {
				const packageJsonPath = resolveRequest(
					path.join(packageName, 'package.json'),
					directoryPath,
				);

				if (packageJsonPath) {
					const packagePath = resolveFromPackageJsonPath(packageJsonPath);

					if (existsSync(packagePath)) {
						return packagePath;
					}
				}
			} else {
				try {
					return resolveRequest(
						filePath,
						directoryPath,
						{ extensions: ['.json'] },
					);
				} catch {
					return resolveRequest(
						path.join(filePath, 'tsconfig.json'),
						directoryPath,
					);
				}
			}
		} catch {}
	}

	let packagePath = findUp(
		directoryPath,
		path.join('node_modules', currentFilePath),
	);

	if (packagePath) {
		if (fs.statSync(packagePath).isDirectory()) {
			const packageJsonPath = path.join(packagePath, 'package.json');

			if (existsSync(packageJsonPath)) {
				packagePath = resolveFromPackageJsonPath(packageJsonPath);
			} else {
				packagePath = path.join(packagePath, 'tsconfig.json');
			}

			if (existsSync(packagePath)) {
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

	throw new Error(`File '${filePath}' not found.`);
}
