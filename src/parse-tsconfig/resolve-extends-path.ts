import path from 'path';
import Module from 'module';
import { resolveExports } from 'resolve-pkg-maps';
import type { PackageJson } from 'type-fest';
import { findUp } from '../utils/find-up.js';
import { readJsonc } from '../utils/read-jsonc.js';
import { stat, exists } from '../utils/fs-cached.js';
import type { Cache } from '../types.js';

const getPnpApi = () => {
	const { findPnpApi } = Module;

	// https://yarnpkg.com/advanced/pnpapi/#requirepnpapi
	return findPnpApi && findPnpApi(process.cwd());
};

const resolveFromPackageJsonPath = (
	packageJsonPath: string,
	subpath: string,
	ignoreExports?: boolean,
	cache?: Cache<string>,
) => {
	const cacheKey = `resolveFromPackageJsonPath:${packageJsonPath}:${subpath}:${ignoreExports}`;
	if (cache?.has(cacheKey)) {
		return cache.get(cacheKey);
	}

	const packageJson = readJsonc(packageJsonPath, cache) as PackageJson;
	if (!packageJson) {
		return;
	}

	let resolvedPath = subpath || 'tsconfig.json';

	if (
		!ignoreExports
		&& packageJson.exports
	) {
		try {
			const [resolvedExport] = resolveExports(packageJson.exports, subpath, ['require', 'types']);
			resolvedPath = resolvedExport;
		} catch {
			// Block
			return false;
		}
	} else if (
		!subpath
		&& packageJson.tsconfig
	) {
		resolvedPath = packageJson.tsconfig as string;
	}

	resolvedPath = path.join(
		packageJsonPath,
		'..',
		resolvedPath,
	);

	cache?.set(cacheKey, resolvedPath);

	return resolvedPath;
};

const PACKAGE_JSON = 'package.json';
const TS_CONFIG_JSON = 'tsconfig.json';

export const resolveExtendsPath = (
	requestedPath: string,
	directoryPath: string,
	cache?: Cache<string>,
) => {
	let filePath = requestedPath;

	if (requestedPath === '..') {
		filePath = path.join(filePath, TS_CONFIG_JSON);
	}

	if (requestedPath[0] === '.') {
		filePath = path.resolve(directoryPath, filePath);
	}

	if (path.isAbsolute(filePath)) {
		if (exists(cache, filePath)) {
			if (stat(cache, filePath)!.isFile()) {
				return filePath;
			}
		} else if (!filePath.endsWith('.json')) {
			const jsonPath = `${filePath}.json`;

			if (exists(cache, jsonPath)) {
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
					const resolvedPath = resolveFromPackageJsonPath(
						packageJsonPath,
						subpath,
						false,
						cache,
					);

					if (resolvedPath && exists(cache, resolvedPath)) {
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
		path.resolve(directoryPath),
		path.join('node_modules', packageName),
		cache,
	);

	if (!packagePath || !stat(cache, packagePath)!.isDirectory()) {
		return;
	}

	const packageJsonPath = path.join(packagePath, PACKAGE_JSON);
	if (exists(cache, packageJsonPath)) {
		const resolvedPath = resolveFromPackageJsonPath(
			packageJsonPath,
			subpath,
			false,
			cache,
		);

		// Blocked
		if (resolvedPath === false) {
			return;
		}

		if (
			resolvedPath
			&& exists(cache, resolvedPath)
			&& stat(cache, resolvedPath)!.isFile()
		) {
			return resolvedPath;
		}
	}

	const fullPackagePath = path.join(packagePath, subpath);
	const jsonExtension = fullPackagePath.endsWith('.json');

	if (!jsonExtension) {
		const fullPackagePathWithJson = `${fullPackagePath}.json`;

		if (exists(cache, fullPackagePathWithJson)) {
			return fullPackagePathWithJson;
		}
	}

	if (!exists(cache, fullPackagePath)) {
		return;
	}

	if (stat(cache, fullPackagePath)!.isDirectory()) {
		const fullPackageJsonPath = path.join(fullPackagePath, PACKAGE_JSON);
		if (exists(cache, fullPackageJsonPath)) {
			const resolvedPath = resolveFromPackageJsonPath(
				fullPackageJsonPath,
				'',
				true,
				cache,
			);
			if (resolvedPath && exists(cache, resolvedPath)) {
				return resolvedPath;
			}
		}

		const tsconfigPath = path.join(fullPackagePath, TS_CONFIG_JSON);
		if (exists(cache, tsconfigPath)) {
			return tsconfigPath;
		}
	} else if (jsonExtension) {
		return fullPackagePath;
	}
};
