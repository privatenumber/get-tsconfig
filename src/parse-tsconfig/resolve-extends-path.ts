import path from 'path';
import fs from 'fs';
import Module from 'module';
import { resolveExports } from 'resolve-pkg-maps';
import type { PackageJson } from 'type-fest';
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
	ignoreExports?: boolean,
) => {
	let resolvedPath = 'tsconfig.json';

	const packageJson = readJsonc(packageJsonPath) as PackageJson;
	if (packageJson) {
		if (
			!ignoreExports
			&& packageJson.exports
		) {
			try {
				const [resolvedExport] = resolveExports(packageJson.exports, subpath, ['require', 'types']);
				resolvedPath = resolvedExport;
			} catch {
				return;
			}
		} else if (
			!subpath
			&& packageJson.tsconfig
		) {
			resolvedPath = packageJson.tsconfig as string;
		}
	}

	return path.join(
		packageJsonPath,
		'..',
		resolvedPath,
	);
};

const PACKAGE_JSON = 'package.json';
const TS_CONFIG_JSON = 'tsconfig.json';

export const resolveExtendsPath = (
	requestedPath: string,
	directoryPath: string,
) => {
	let filePath = requestedPath;

	if (requestedPath === '..') {
		filePath = path.join(filePath, TS_CONFIG_JSON);
	}

	if (requestedPath[0] === '.') {
		filePath = path.resolve(directoryPath, filePath);
	}

	if (path.isAbsolute(filePath)) {
		if (existsSync(filePath)) {
			if (fs.statSync(filePath).isFile()) {
				return filePath;
			}
		} else if (!filePath.endsWith('.json')) {
			const jsonPath = `${filePath}.json`;

			if (existsSync(jsonPath)) {
				return jsonPath;
			}
		}
		return;
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
					path.join(packageName, PACKAGE_JSON),
					directoryPath,
				);

				if (packageJsonPath) {
					const resolvedPath = resolveFromPackageJsonPath(packageJsonPath, subpath);

					if (resolvedPath && existsSync(resolvedPath)) {
						return resolvedPath;
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
						path.join(requestedPath, TS_CONFIG_JSON),
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
		return;
	}

	const packageJsonPath = path.join(packagePath, PACKAGE_JSON);
	if (existsSync(packageJsonPath)) {
		const resolvedPath = resolveFromPackageJsonPath(packageJsonPath, subpath);

		if (!resolvedPath) {
			return;
		}

		if (existsSync(resolvedPath)) {
			return resolvedPath;
		}
	}

	const fullPackagePath = path.join(packagePath, subpath);
	const jsonExtension = fullPackagePath.endsWith('.json');

	if (!jsonExtension) {
		const fullPackagePathWithJson = `${fullPackagePath}.json`;

		if (existsSync(fullPackagePathWithJson)) {
			return fullPackagePathWithJson;
		}
	}

	if (!existsSync(fullPackagePath)) {
		return;
	}

	if (fs.statSync(fullPackagePath).isDirectory()) {
		const fullPackageJsonPath = path.join(fullPackagePath, PACKAGE_JSON);
		if (existsSync(fullPackageJsonPath)) {
			const resolvedPath = resolveFromPackageJsonPath(fullPackageJsonPath, '', true);
			if (resolvedPath && existsSync(resolvedPath)) {
				return resolvedPath;
			}
		}

		const tsconfigPath = path.join(fullPackagePath, TS_CONFIG_JSON);
		if (existsSync(tsconfigPath)) {
			return tsconfigPath;
		}
	} else if (jsonExtension) {
		return fullPackagePath;
	}
}
