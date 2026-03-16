import path from 'node:path';
import Module from 'node:module';
import { resolveExports } from 'resolve-pkg-maps';
import type { PackageJson } from 'type-fest';
import { findUp } from '../utils/find-up.js';
import { readJsonc } from '../utils/read-jsonc.js';
import { tryStat } from '../utils/fs-cached.js';
import type { TsconfigCache } from '../types.js';

const getPnpApi = () => {
	const { findPnpApi } = Module;

	// https://yarnpkg.com/advanced/pnpapi/#requirepnpapi
	return findPnpApi && findPnpApi(process.cwd());
};

const findPackageJsonPath = (
	searchPath: string,
	cache?: TsconfigCache,
) => {
	let currentPath = searchPath;

	while (true) {
		const packageJsonPath = path.join(currentPath, PACKAGE_JSON);
		if (tryStat(cache, packageJsonPath)?.isFile()) {
			return packageJsonPath;
		}

		const parentPath = path.dirname(currentPath);
		if (parentPath === currentPath) {
			return;
		}

		currentPath = parentPath;
	}
};

const createNodeResolver = (
	directoryPath: string,
) => Module.createRequire(path.join(directoryPath, 'tsconfig.json'));

const resolvePackageJsonPathWithNode = (
	packageName: string,
	directoryPath: string,
	cache?: TsconfigCache,
) => {
	const resolveWithNode = createNodeResolver(directoryPath);

	try {
		return resolveWithNode.resolve(`${packageName}/${PACKAGE_JSON}`);
	} catch {}

	try {
		const packageEntryPath = resolveWithNode.resolve(packageName);
		return findPackageJsonPath(path.dirname(packageEntryPath), cache);
	} catch {}
};

const resolveFromPackageJsonPath = (
	packageJsonPath: string,
	subpath: string,
	ignoreExports?: boolean,
	cache?: TsconfigCache<string>,
) => {
	const cacheKey = `resolveFromPackageJsonPath:${packageJsonPath}:${subpath}:${ignoreExports}`;
	if (cache?.has(cacheKey)) {
		const cached = cache.get(cacheKey);
		// Empty string is sentinel for blocked exports
		return cached || false;
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
			// Block — cache empty string as sentinel for blocked exports
			cache?.set(cacheKey, '');
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
	cache?: TsconfigCache<string>,
) => {
	const cacheKey = `resolveExtendsPath:${requestedPath}:${directoryPath}`;
	if (cache?.has(cacheKey)) {
		return cache.get(cacheKey) || undefined;
	}

	const result = resolveExtendsPathUncached(requestedPath, directoryPath, cache);
	cache?.set(cacheKey, result || '');

	return result;
};

const resolveExtendsPathUncached = (
	requestedPath: string,
	directoryPath: string,
	cache?: TsconfigCache<string>,
) => {
	let filePath = requestedPath;

	if (requestedPath === '..') {
		filePath = path.join(filePath, TS_CONFIG_JSON);
	}

	if (requestedPath[0] === '.') {
		filePath = path.resolve(directoryPath, filePath);
	}

	if (path.isAbsolute(filePath)) {
		const fileStat = tryStat(cache, filePath);
		if (fileStat) {
			if (fileStat.isFile()) {
				return filePath;
			}
		} else if (!filePath.endsWith('.json')) {
			const jsonPath = `${filePath}.json`;

			if (tryStat(cache, jsonPath)) {
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

					if (resolvedPath && tryStat(cache, resolvedPath)) {
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

	const resolvedPackageJsonPath = resolvePackageJsonPathWithNode(
		packageName,
		directoryPath,
		cache,
	);

	const packagePath = (
		resolvedPackageJsonPath
		&& path.dirname(resolvedPackageJsonPath)
	) || findUp(
		path.resolve(directoryPath),
		path.join('node_modules', packageName),
		cache,
	);

	if (!packagePath || !tryStat(cache, packagePath)?.isDirectory()) {
		return;
	}

	const packageJsonPath = path.join(packagePath, PACKAGE_JSON);
	if (tryStat(cache, packageJsonPath)) {
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
			&& tryStat(cache, resolvedPath)?.isFile()
		) {
			return resolvedPath;
		}
	}

	const fullPackagePath = path.join(packagePath, subpath);
	const jsonExtension = fullPackagePath.endsWith('.json');

	if (!jsonExtension) {
		const fullPackagePathWithJson = `${fullPackagePath}.json`;

		if (tryStat(cache, fullPackagePathWithJson)) {
			return fullPackagePathWithJson;
		}
	}

	const fullPackageStat = tryStat(cache, fullPackagePath);
	if (!fullPackageStat) {
		return;
	}

	if (fullPackageStat.isDirectory()) {
		const fullPackageJsonPath = path.join(fullPackagePath, PACKAGE_JSON);
		if (tryStat(cache, fullPackageJsonPath)) {
			const resolvedPath = resolveFromPackageJsonPath(
				fullPackageJsonPath,
				'',
				true,
				cache,
			);
			if (resolvedPath && tryStat(cache, resolvedPath)) {
				return resolvedPath;
			}
		}

		const tsconfigPath = path.join(fullPackagePath, TS_CONFIG_JSON);
		if (tryStat(cache, tsconfigPath)) {
			return tsconfigPath;
		}
	} else if (jsonExtension) {
		return fullPackagePath;
	}
};
