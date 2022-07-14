import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { findUp } from '../utils/find-up';

const pathExists = (filePath: string) => fs.existsSync(filePath);

const safeJsonParse = (jsonString: string) => {
	try {
		return JSON.parse(jsonString);
	} catch {}
};

// eslint-disable-next-line complexity
export function resolveExtends(filePath: string, directoryPath: string) {
	let currentFilePath = filePath;

	if (currentFilePath === '..') {
		currentFilePath += '/tsconfig.json';
	}

	// Relative path
	if (currentFilePath.startsWith('.')) {
		let tsconfigPath = path.resolve(directoryPath, currentFilePath);

		if (pathExists(tsconfigPath) && fs.statSync(tsconfigPath).isFile()) {
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

	let pnpapi;

	const { pnp } = process.versions;

	if (pnp) {
		const require = createRequire(
			// @ts-expect-error -- it will be transformed at build time
			import.meta.url,
		);
		try {
			/** @see https://yarnpkg.com/advanced/pnpapi/#requirepnpapi */
			// eslint-disable-next-line import/no-unresolved
			pnpapi = require('pnpapi');
		} catch {}
	}

	if (pnpapi) {
		console.log('PnP detected');
		const [first, second] = filePath.split('/');
		const pkg = first.startsWith('@') ? `${first}/${second}` : first;

		if (pkg === filePath) {
			try {
				const packageJsonpath = pnpapi.resolveRequest(
					`${pkg}/package.json`,
					directoryPath,
				);
				const packageJson = safeJsonParse(
					fs.readFileSync(packageJsonpath, 'utf8'),
				);
				let packagePath = path.join(packageJsonpath, '..');
				if (packageJson && 'tsconfig' in packageJson) {
					packagePath = path.join(packagePath, packageJson.tsconfig);
				} else {
					packagePath = path.join(packagePath, 'tsconfig.json');
				}
				if (pathExists(packagePath)) {
					return packagePath;
				}
			} catch {}
		} else {
			try {
				return pnpapi.resolveRequest(filePath, directoryPath, {
					extensions: ['.json'],
				});
			} catch {}
		}
	}

	let packagePath = findUp(
		directoryPath,
		path.join('node_modules', currentFilePath),
	);

	if (packagePath) {
		if (fs.statSync(packagePath).isDirectory()) {
			const packageJsonpath = path.join(packagePath, 'package.json');

			if (pathExists(packageJsonpath)) {
				const packageJson = safeJsonParse(
					fs.readFileSync(packageJsonpath, 'utf8'),
				);

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

	throw new Error(`File '${filePath}' not found.`);
}
