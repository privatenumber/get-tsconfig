import fs from 'fs';
import path from 'path';
import { parse } from 'jsonc-parser';
import type { PackageJson } from 'type-fest';
import { resolve as resolveExports } from 'resolve.exports';
import { findUp } from './utils/find-up';
import { createPathsMatcher, type PathsMatcher } from './paths-matcher/index';
import type { TsConfigResult } from './types';

function readJson(
	api: Pick<typeof fs, 'readFileSync'>,
	jsonPath: string,
) {
	const packageJsonString = api.readFileSync(jsonPath, 'utf8');
	return parse(packageJsonString);
}

const stripExtensionPattern = /\.([mc]js|jsx?)$/;

type FsAPI = Pick<typeof fs, 'existsSync' | 'readFileSync' | 'statSync' | 'realpathSync'>;

const safeStat = (
	api: FsAPI,
	request: string,
) => (api.existsSync(request) && api.statSync(request));

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

	const packageJson = readJson(api, packageJsonPath) as PackageJson;
	if (!packageJson || typeof packageJson !== 'object') {
		return undefined;
	}

	return packageJson.main;
}

function resolve(
	request: string,
	api: FsAPI,
	extensions: string[],
	nextGenExtensions: Record<string, string[]>,
): string | undefined {
	let resolved = tryExtensions(request, api, extensions);
	if (resolved) {
		return resolved;
	}

	// If it has .js, strip it off and try again from start
	const hasExtension = request.match(stripExtensionPattern);
	if (hasExtension) {
		resolved = tryExtensions(
			request.slice(0, hasExtension.index),
			api,
			(
				nextGenExtensions[hasExtension[1] as string]
				|| extensions
			),
		);

		if (resolved) {
			return resolved;
		}
	}

	const stat = safeStat(api, request);
	if (stat && stat.isDirectory()) {

		// Check if package.json#main exists
		const hasMain = getPackageEntry(request, api);
		if (hasMain) {
			const mainPath = path.join(request, hasMain);
			const mainStat = safeStat(api, mainPath);
			if (mainStat && mainStat.isFile()) {
				return mainPath;
			}

			resolved = resolve(mainPath, api, extensions, nextGenExtensions);

			if (resolved) {
				return resolved;
			}
		}

		// Fallback to index if main path doesnt exist
		resolved = tryExtensions(path.join(request, 'index'), api, extensions);

		if (resolved) {
			return resolved;
		}
	}
}

function resolveExtensionlessPath(
	request: string,
	api: FsAPI,
) {
	// Try resolving in TypeScript mode
	let resolved = resolve(
		request,
		api,
		['.ts', '.tsx'],
		{
			mjs: ['.mts'],
			cjs: ['.cts'],
		},
	);

	if (resolved) {
		return resolved;
	}

	// Try resolving in JavaScript mode
	resolved = resolve(
		request,
		api,
		['.js', '.jsx'],
		{
			mjs: ['.mjs'],
			cjs: ['.cjs'],
		},
	);

	if (resolved) {
		return resolved;
	}
}

function resolveBareSpecifier(
	request: string,
	context: string,
	pathsResolver: PathsMatcher | null | undefined,
	api: FsAPI,
) {
	// Try tsconfig.paths
	if (pathsResolver) {
		const possiblePaths = pathsResolver(request);

		for (const possiblePath of possiblePaths) {

			/**
			 * If a path resolves to a package,
			 * would it resolve the export maps?
			 * 
			 * Also, what if we resolve a package path
			 * by absolute path? Would it resolve the export map?
			 * Or does it need to be resolved by bare specifier?
			 */
			const resolved = resolveExtensionlessPath(possiblePath, api);
			if (resolved) {
				return resolved;
			}
		}
	}

	/*
	1. Find all node_module parent directories
	2. 

	*/

	const nodeModuleDirectories = findUp(context, 'node_modules', true, api);
	for (const nodeModuleDirectory of nodeModuleDirectories) {
		const dependencyPath = path.join(nodeModuleDirectory, request);
		const packageJsonPath = path.join(dependencyPath, 'package.json');

		if (api.existsSync(packageJsonPath)) {
			// test missing path in main
			const hasMain = getPackageEntry(dependencyPath, api);
			if (hasMain) {
				const resolved = resolveExtensionlessPath(path.join(dependencyPath, hasMain), api);
				if (resolved) {
					return resolved;
				}
			}
		} else {
			console.log('package.json not found', packageJsonPath);
		}

		const resolved = resolveExtensionlessPath(dependencyPath, api);
		if (resolved) {
			return resolved;
		}
	}
}

export function createResolver(
	tsconfig?: TsConfigResult,
	api: FsAPI = fs,
) {
	const preserveSymlinks = tsconfig?.config.compilerOptions?.preserveSymlinks;
	const pathsResolver = tsconfig && createPathsMatcher(tsconfig);

	// TODO: include Node.js's --preserve-symlinks
	const resolveSymlink = (path: string | undefined) => (
		(!path || preserveSymlinks)
			? path
			: api.realpathSync(path)
	);

	return function tsResolve(
		request: string,
		context: string,
	): string | undefined {

		// Resolve relative specifier
		if (request.startsWith('.')) {
			request = path.join(context, request);
		}
	
		// Absolute specifier
		if (request.startsWith('/')) {
			return resolveSymlink(resolveExtensionlessPath(request, api));
		}

		// Resolve bare specifier
		return resolveSymlink(
			resolveBareSpecifier(
				request,
				context,
				pathsResolver,
				api,
			),
		);
	};
}