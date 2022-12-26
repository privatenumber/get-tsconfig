import path from 'path';
import type { PackageJson } from 'type-fest';
import { type PathsMatcher } from '../paths-matcher/index';
import { findUp } from '../utils/find-up';
import { parsePackageName } from '../utils/parse-package-name';
import { readJsonc } from '../utils/read-jsonc';
import type { FsAPI } from './types';
import { resolvePathExtension } from './resolve-path-extension';
import { resolveExports } from 'resolve-pkg-exports';

// Export maps
// https://github.com/microsoft/TypeScript/blob/71e852922888337ef51a0e48416034a94a6c34d9/src/compiler/moduleSpecifiers.ts#L663

// Import maps
//https://github.com/microsoft/TypeScript/blob/71e852922888337ef51a0e48416034a94a6c34d9/src/compiler/moduleNameResolver.ts#L2101

export function resolveBareSpecifier(
	request: string,
	context: string,
	conditions: string[] | undefined,
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
			const resolved = resolvePathExtension(possiblePath, api);
			if (resolved) {
				return resolved;
			}
		}
	}

	/*
	1. Find all node_module parent directories
	2. parse the package to find package directory (eg. dep/a -> dep)
	3. check exports map and check path against it
	*/
	const nodeModuleDirectories = findUp(context, 'node_modules', true, api);
	const { packageName, packageSubpath } = parsePackageName(request);

	for (const nodeModuleDirectory of nodeModuleDirectories) {
		const dependencyPath = path.join(nodeModuleDirectory, packageName);
		const packageJsonPath = path.join(dependencyPath, 'package.json');

		if (api.existsSync(packageJsonPath)) {
			const packageJson = readJsonc<PackageJson>(packageJsonPath, api);

			if (packageJson) {
				const { exports } = packageJson;
				if (exports) {
					const resolvedSubpaths = resolveExports(
						exports,
						packageSubpath,
						conditions || [],
					);

					for (const possibleSubpath of resolvedSubpaths) {
						const resolved = resolvePathExtension(
							path.join(dependencyPath, possibleSubpath),
							api,
						);

						if (resolved) {
							return resolved;
						}
					}

					// If not in export maps, dont allow lookups
					continue;
				}

				if (!packageSubpath && packageJson.main) {
					const resolved = resolvePathExtension(
						path.join(dependencyPath, packageJson.main),
						api,
					);
					if (resolved) {
						return resolved;
					}
				}
			}
		}

		// Also resolves subpaths if packgae.json#main or #exports doesnt exist
		const resolved = resolvePathExtension(
			path.join(nodeModuleDirectory, request),
			api,
		);
		if (resolved) {
			return resolved;
		}
	}
}
