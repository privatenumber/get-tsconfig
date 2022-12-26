import fs from 'fs';
import path from 'path';
import { createPathsMatcher } from '../paths-matcher/index';
import type { TsConfigResult } from '../types';
import { resolveBareSpecifier } from './resolve-bare-specifier';
import type { FsAPI } from './types';
import { resolvePathExtension } from './resolve-path-extension';

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

	return function resolver(
		request: string,
		context: string,
		conditions?: string[],
	): string | undefined {
		// Resolve relative specifier
		if (request.startsWith('.')) {
			request = path.join(context, request);
		}

		// Absolute specifier
		if (request.startsWith('/')) {
			return resolveSymlink(resolvePathExtension(request, api));
		}

		// Resolve bare specifier
		return resolveSymlink(
			resolveBareSpecifier(
				request,
				context,
				conditions,
				pathsResolver,
				api,
			),
		);
	};
}
