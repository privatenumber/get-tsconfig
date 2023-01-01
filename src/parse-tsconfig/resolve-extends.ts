import path from 'path';
import fs from 'fs';
import Module from 'module';
import { findUp } from '../utils/find-up.js';
import { readJsonc } from '../utils/read-jsonc.js';

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

	const pnpApi = getPnpApi();
	if (pnpApi) {
		const { resolveRequest: resolveWithPnp } = pnpApi;
		const [first, second] = requestedPath.split('/');
		const packageName = first.startsWith('@') ? `${first}/${second}` : first;

		try {
			if (packageName === requestedPath) {
				const packageJsonPath = resolveWithPnp(
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
		path.join('node_modules', attemptingPath),
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

	if (!attemptingPath.endsWith('.json')) {
		attemptingPath += '.json';

		packagePath = findUp(
			directoryPath,
			path.join('node_modules', attemptingPath),
		);

		if (packagePath) {
			return packagePath;
		}
	}

	throw new Error(`File '${requestedPath}' not found.`);
}
