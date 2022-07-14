import path from 'path';
import fs from 'fs';
import Module from 'module';
import { findUp } from '../utils/find-up';

const pathExists = (filePath: string) => fs.existsSync(filePath);

const safeJsonParse = (jsonString: string) => {
	try {
		return JSON.parse(jsonString);
	} catch {}
};

const getPnpApi = () => {
	const { findPnpApi } = Module;

	// https://yarnpkg.com/advanced/pnpapi/#requirepnpapi
	return findPnpApi && findPnpApi(process.cwd());
};

function resolveFromPackageJsonPath(packageJsonPath: string) {
	const packageJson = safeJsonParse(
		fs.readFileSync(packageJsonPath, 'utf8'),
	);

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

		throw new Error(`File '${filePath}' not found.`);
	}

	const pnpApi = getPnpApi();
	console.log({pnpApi});
	if (pnpApi) {
		const [first, second] = filePath.split('/');
		const packageName = first.startsWith('@') ? `${first}/${second}` : first;

		try {
			if (packageName === filePath) {
				console.log({
					filePath,
					packageName,
				});
				const packageJsonPath = pnpApi.resolveRequest(
					path.join(packageName, 'package.json'),
					directoryPath,
				);

				console.log({ packageJsonPath });

				if (packageJsonPath) {
					const packagePath = resolveFromPackageJsonPath(packageJsonPath);

					if (pathExists(packagePath)) {
						return packagePath;
					}
				}
			} else {
				try {
					return pnpApi.resolveRequest(
						filePath,
						directoryPath,
						{ extensions: ['.json'] },
					);
				} catch {
					return pnpApi.resolveRequest(
						path.join(filePath, 'tsconfig.json'),
						directoryPath,
					);
				}
			}
		} catch (error) {
			console.log(error);
		}
	}

	let packagePath = findUp(
		directoryPath,
		path.join('node_modules', currentFilePath),
	);

	if (packagePath) {
		if (fs.statSync(packagePath).isDirectory()) {
			const packageJsonPath = path.join(packagePath, 'package.json');

			if (pathExists(packageJsonPath)) {
				packagePath = resolveFromPackageJsonPath(packageJsonPath);
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

	throw new Error(`File '${filePath}' not found.`);
}
