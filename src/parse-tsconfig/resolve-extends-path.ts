import path from 'path';
import fs from 'fs';
import Module from 'module';
import { resolveExports } from 'resolve-pkg-maps';
import { findUp } from '../utils/find-up.js';
import { readJsonc } from '../utils/read-jsonc.js';

const { existsSync } = fs;

const getPnpApi = () => {
	const { findPnpApi } = Module;

	// https://yarnpkg.com/advanced/pnpapi/#requirepnpapi
	return findPnpApi && findPnpApi(process.cwd());
};

const resolveFromPackageJsonPath = (
	packageJsonPath: string,
	subpath: string,
) => {
	const packageJson = readJsonc(packageJsonPath);
	// let subpath = 'tsconfig.json';
	let resolvedPath = '';
	if (
		packageJson // do we need this?
		&& 'exports' in packageJson
		&& packageJson.exports
	) {
		try {
			const [resolvedExport] = resolveExports(packageJson.exports, subpath, ['require', 'types']);
			resolvedPath = resolvedExport;	
		} catch (error) {
			return;
		}
	} else if (packageJson && ('tsconfig' in packageJson)) {
		resolvedPath = packageJson.tsconfig;
	}

	return path.join(
		packageJsonPath,
		'..',
		resolvedPath || 'tsconfig.json',
	);
}

export function resolveExtendsPath(
	requestedPath: string,
	directoryPath: string,
) {
	let attemptingPath = requestedPath;

	const isRelative = requestedPath[0] === '.';

	// Is file path
	if (
		isRelative
		|| path.isAbsolute(requestedPath)
	) {
		if (isRelative) {
			if (attemptingPath === '..') {
				attemptingPath += '/tsconfig.json';
			}

			attemptingPath = path.resolve(directoryPath, attemptingPath);
		}

		if (
			existsSync(attemptingPath)
			&& fs.statSync(attemptingPath).isFile()
		) {
			return attemptingPath;
		}

		if (!attemptingPath.endsWith('.json')) {
			attemptingPath += '.json';

			if (existsSync(attemptingPath)) {
				return attemptingPath;
			}
		}

		throw new Error(`File '${requestedPath}' not found.`);
	}

	const [orgOrName, ...remaining] = requestedPath.split('/');
	const packageName = orgOrName[0] === '@' ? `${orgOrName}/${remaining.shift()}` : orgOrName;
	const subpath = remaining.join('/');

	const pnpApi = getPnpApi();
	if (pnpApi) {
		const { resolveRequest: resolveWithPnp } = pnpApi;

		try {
			if (packageName === requestedPath) {
				const packageJsonPath = resolveWithPnp(
					path.join(packageName, 'package.json'),
					directoryPath,
				);

				if (packageJsonPath) {
					const packagePath = resolveFromPackageJsonPath(packageJsonPath, subpath);

					if (packagePath && existsSync(packagePath)) {
						return packagePath;
					}
				}
			} else {
				let resolved: string | null;
				try {
					resolved = resolveWithPnp(
						requestedPath,
						directoryPath,
						{ extensions: ['.json'] },
					);
				} catch {
					resolved = resolveWithPnp(
						path.join(requestedPath, 'tsconfig.json'),
						directoryPath,
					);
				}

				if (resolved) {
					return resolved;
				}
			}
		} catch {}
	}

	let packagePath = findUp(
		directoryPath,
		path.join('node_modules', packageName),
	);

	if (!packagePath || !fs.statSync(packagePath).isDirectory()) {
		throw new Error(`File '${requestedPath}' not found.`);
	}

	const packageJsonPath = path.join(packagePath, 'package.json');

	if (existsSync(packageJsonPath)) {
		const packageJson = readJsonc(packageJsonPath);

		// What happens if its invalid?
		if (packageJson) {
			let resolvedPath = '';
			if (
				'exports' in packageJson
				&& packageJson.exports
			) {
				try {
					const [resolvedExport] = resolveExports(packageJson.exports, subpath, ['require', 'types']);
					resolvedPath = resolvedExport;	
				} catch (error) {
					throw new Error(`File '${requestedPath}' not found.`);
				}
			} else if ('tsconfig' in packageJson) {
				resolvedPath = packageJson.tsconfig;
			}

			const resolvedFromPackageJson = path.join(
				packageJsonPath,
				'..',
				resolvedPath || 'tsconfig.json',
			);

			if (existsSync(resolvedFromPackageJson)) {
				return resolvedFromPackageJson;
			}
		}
	}

	const fullPackagePath = path.join(packagePath, subpath);

	if (!fullPackagePath.endsWith('.json')) {
		const fullPackagePathWithJson = fullPackagePath + '.json';

		if (existsSync(fullPackagePathWithJson)) {
			return fullPackagePathWithJson;
		}
	}

	if (existsSync(fullPackagePath)) {
		if (fs.statSync(fullPackagePath).isDirectory()) {
			let packageJsonPath = path.join(fullPackagePath, 'package.json');
			if (existsSync(packageJsonPath)) {
				const packageJson = readJsonc(packageJsonPath);
	
				if (packageJson && 'tsconfig' in packageJson) {
					const resolvedFromPackageJson = path.join(
						packageJsonPath,
						'..',
						packageJson.tsconfig,
					);
	
					if (existsSync(resolvedFromPackageJson)) {
						return resolvedFromPackageJson;
					}
				}
			} else {
				// console.log(111);
			}
		} else {
			if (fullPackagePath.endsWith('.json')) {
				return fullPackagePath;
			}
		}
	} else {
	
	}
	// if (!existsSync(packageJsonPath)) {
		// Not sure if this logic makes sense because it ignores subpath. Probably add it back
		// const tsconfigJsonPath = path.join(packagePath, 'tsconfig.json');

		// if (existsSync(tsconfigJsonPath)) {
		// 	return tsconfigJsonPath;
		// }
	// }

	// if (existsSync(packageJsonPath)) {
	// 	const asdf = resolveFromPackageJsonPath(packageJsonPath, subpath);
	// 	if (asdf && existsSync(asdf)) {
	// 		return asdf;
	// 	}
	// } else {

	// }

	const tsconfigPath = path.join(packagePath, subpath, 'tsconfig.json');
	if (existsSync(tsconfigPath)) {
		return tsconfigPath;
	}


	// if (packagePath) {
	// 	if (fs.statSync(packagePath).isDirectory()) {
	// 		const packageJsonPath = path.join(packagePath, 'package.json');

	// 		if (existsSync(packageJsonPath)) {
	// 			console.log(111, arguments);
	// 			packagePath = resolveFromPackageJsonPath(packageJsonPath, subpath);
	// 		} else {
	// 			packagePath = path.join(packagePath, 'tsconfig.json');
	// 		}

	// 		if (packagePath && existsSync(packagePath)) {
	// 			return packagePath;
	// 		}
	// 	} else if (packagePath.endsWith('.json')) {
	// 		return packagePath;
	// 	}
	// }


	throw new Error(`File '${requestedPath}' not found.`);
}
