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
		} catch {
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
};

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

		if (existsSync(attemptingPath)) {
			if (fs.statSync(attemptingPath).isFile()) {
				return attemptingPath;
			}
		} else if (!attemptingPath.endsWith('.json')) {
			const jsonPath = attemptingPath + '.json';

			if (existsSync(jsonPath)) {
				return jsonPath;
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

	const packagePath = findUp(
		directoryPath,
		path.join('node_modules', packageName),
	);

	if (!packagePath || !fs.statSync(packagePath).isDirectory()) {
		throw new Error(`File '${requestedPath}' not found.`);
	}

	const packageJsonPath = path.join(packagePath, 'package.json');

	if (existsSync(packageJsonPath)) {
		const packageJson = readJsonc(packageJsonPath);

		if (packageJson) {
			let resolvedPath = '';
			if (
				'exports' in packageJson
				&& packageJson.exports
			) {
				try {
					const [resolvedExport] = resolveExports(packageJson.exports, subpath, ['require', 'types']);
					resolvedPath = resolvedExport;
				} catch {
					throw new Error(`File '${requestedPath}' not found.`);
				}
			} else if ('tsconfig' in packageJson) {
				resolvedPath = packageJson.tsconfig;
			}

			const resolvedFromPackageJson = path.join(
				packagePath,
				resolvedPath || 'tsconfig.json',
			);

			if (existsSync(resolvedFromPackageJson)) {
				return resolvedFromPackageJson;
			}
		}
	}

	const fullPackagePath = path.join(packagePath, subpath);

	if (!fullPackagePath.endsWith('.json')) {
		const fullPackagePathWithJson = `${fullPackagePath}.json`;

		if (existsSync(fullPackagePathWithJson)) {
			return fullPackagePathWithJson;
		}
	}

	if (existsSync(fullPackagePath)) {
		if (fs.statSync(fullPackagePath).isDirectory()) {
			const packageJsonPath = path.join(fullPackagePath, 'package.json');
			if (existsSync(packageJsonPath)) {
				const packageJson = readJsonc(packageJsonPath);
				if (
					packageJson
					&& 'tsconfig' in packageJson
				) {
					const resolvedFromPackageJson = path.join(
						packageJsonPath,
						'..',
						packageJson.tsconfig,
					);

					if (existsSync(resolvedFromPackageJson)) {
						return resolvedFromPackageJson;
					}
				}
			}

			const tsconfigPath = path.join(fullPackagePath, 'tsconfig.json');
			if (existsSync(tsconfigPath)) {
				return tsconfigPath;
			}
		} else if (fullPackagePath.endsWith('.json')) {
			return fullPackagePath;
		}
	}

	throw new Error(`File '${requestedPath}' not found.`);
}
