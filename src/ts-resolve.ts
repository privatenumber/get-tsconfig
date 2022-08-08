import fs from 'fs';
import { parse } from 'jsonc-parser';
import type { PackageJson } from 'type-fest';

const extensionsJs = ['.js', '.jsx'];
const extensionsTs = ['.ts', '.tsx'];
const jsxExtensionPattern = /\.jsx?$/;

type FsAPI = Pick<typeof fs, 'existsSync' | 'readFileSync' | 'statSync'>;

function tryExtensions(
	request: string,
	api: FsAPI,
	extensions: string[],
) {
	for (const extension of extensions) {
		const checkPath = request + extension;
		if (api.existsSync(checkPath)) {
			return checkPath;
		}
	}
}

function getPackageEntry(
	request: string,
	api: FsAPI,
) {
	const packageJsonPath = `${request}/package.json`;
	if (!api.existsSync(packageJsonPath)) {
		return undefined;
	}

	const packageJsonString = api.readFileSync(packageJsonPath, 'utf8');
	const packageJson = parse(packageJsonString) as PackageJson;

	if (!packageJson || typeof packageJson !== 'object') {
		return undefined;
	}

	return packageJson.main;
}

function resolve(
	request: string,
	api: FsAPI,
	extensions: string[],
): string | undefined {
	let resolved = tryExtensions(request, api, extensions);
	if (resolved) {
		return resolved;
	}

	// If it has .js, strip it off and try again from start
	if (jsxExtensionPattern.test(request)) {
		resolved = tryExtensions(request.replace(jsxExtensionPattern, ''), api, extensions);

		if (resolved) {
			return resolved;
		}
	}

	const stat = api.statSync(request);
	if (stat.isDirectory()) {
		// Check if package.json exists
		// try package.json#main
		const hasMain = getPackageEntry(request, api);
		if (hasMain) {
			resolved = resolve(hasMain, api, extensions);
			if (resolved) {
				return	resolved;
			}
		}

		// Fallback if main path doesnt exist
		// Try index.ts, index.tsx
		resolved = tryExtensions(`${request}/index`, api, extensions);

		if (resolved) {
			return resolved;
		}
	}
}

export function tsResolve(
	request: string,
	api: FsAPI = fs,
) {
	// Try resolving in TypeScript mode
	let resolved = resolve(request, api, extensionsTs);
	if (resolved) {
		return resolved;
	}

	// Try resolving in JavaScript mode
	resolved = resolve(request, api, extensionsJs);
	if (resolved) {
		return resolved;
	}
}
