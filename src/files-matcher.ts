import path from 'path';
import type { TsConfigJson } from 'type-fest';
import type { TsConfigResult } from './types.js';

// https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/commandLineParser.ts#L3014-L3016
const getDefaultExcludeSpec = (
	compilerOptions: TsConfigJson['compilerOptions'],
) => {
	const excludesSpec: string[] = [];

	if (!compilerOptions) {
		return excludesSpec;
	}

	const { outDir, declarationDir } = compilerOptions;
	if (outDir) {
		excludesSpec.push(outDir);
	}

	if (declarationDir) {
		excludesSpec.push(declarationDir);
	}

	return excludesSpec;
};

const baseExtensions = {
	ts: ['.ts', '.tsx', '.d.ts'],
	cts: ['.cts', '.d.cts'],
	mts: ['.mts', '.d.mts'],
} as const;

const getSupportedExtensions = (
	compilerOptions: TsConfigJson['compilerOptions'],
) => {
	const ts: string[] = [...baseExtensions.ts];
	const cts: string[] = [...baseExtensions.cts];
	const mts: string[] = [...baseExtensions.mts];

	if (compilerOptions?.allowJs) {
		ts.push('.js', '.jsx');
		cts.push('.cjs');
		mts.push('.mjs');
	}

	const extensions = [
		...ts,
		...cts,
		...mts,
	];

	return extensions;
};

const escapeForRegexp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 *
 * File matchers
 * replace *, ?, and ** / with regex
 * https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8088
*/


/**
 * Test
 * - node_modules, bower_components, jspm_packages are excluded
 * .min.js files are excluded
 *
 */

const commonPackageFolders = ['node_modules', 'bower_components', 'jspm_packages'] as const;
const implicitExcludePathRegexPattern = `(?!(${commonPackageFolders.join('|')})(/|$))`;

/**
 * Convert pattern to regex
 *
 * getSubPatternFromSpec
 * https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8165
 */

/**
 * matchFiles
 * https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8291
 *
 *
 * inside, it seems to call `getFileMatcherPatterns` to apply
 * 	- getRegularExpressionForWildcard(includes, absolutePath, "files"),
 *  - getRegularExpressionForWildcard(includes, absolutePath, "directories")
 *  - getRegularExpressionForWildcard(excludes, absolutePath, "exclude")
 *
 *
 * getFileMatcherPatterns
 * https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8267
 */

/**
 * An "includes" path "foo" is implicitly a glob "foo/** /*" (without the space) if its last component has no extension,
 * and does not contain any glob characters itself.
 */
const isImplicitGlobPattern = /^[^.*?]+$/;

const matchAllGlob = '**/*';

export const createFilesMatcher = (
	{ config, path: tsconfigPath }: TsConfigResult,
	useCaseSensitiveFileNames = false,
) => {
	const projectDirectory = path.dirname(tsconfigPath);
	const {
		files, include, exclude, compilerOptions,
	} = config;

	const excludeSpec = exclude || getDefaultExcludeSpec(compilerOptions);

	// https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/commandLineParser.ts#LL3020C29-L3020C47
	const includeSpec = !(files || include) ? [matchAllGlob] : include;

	const extensions = getSupportedExtensions(compilerOptions);

	const regexpFlags = useCaseSensitiveFileNames ? '' : 'i';
	/**
	 * Match entire directory for `exclude`
	 * https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8135
	 */
	const excludePatterns = excludeSpec
		.map((filePath) => {
			const projectFilePath = path.join(projectDirectory, filePath);
			const projectFilePathPattern = escapeForRegexp(projectFilePath)

				// Replace **/
				.replace(/\\\*\\\*\//g, '(.+/)?')

				// Replace *
				.replace(/\\\*/g, '[^/]*')

				// Replace ?
				.replace(/\\\?/g, '[^/]');

			return new RegExp(
				`^${projectFilePathPattern}($|/)`,
				regexpFlags,
			);
		});

	const includePatterns = includeSpec ? includeSpec
		.map((filePath) => {
			let projectFilePath = filePath;

			// https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8178
			if (isImplicitGlobPattern.test(projectFilePath)) {
				projectFilePath += `/${matchAllGlob}`;
			}

			const projectFilePathPattern = escapeForRegexp(projectFilePath)

				// Replace /**
				.replace(/(^|\/)\\\*\\\*/g, `(/${implicitExcludePathRegexPattern}[^/.][^/]*)*?`)

				// Replace *
				.replace(/(\/)?\\\*/g, (_, hasSlash) => {
					const pattern = '[^./]([^./]|(\\.(?!min\\.js$))?)*';

					if (hasSlash) {
						return `\/${implicitExcludePathRegexPattern}${pattern}`;
					}

					return pattern;
				})

				// Replace ?
				.replace(/(\/)?\\\?/g, (_, hasSlash) => {
					const pattern = '[^./]';
					if (hasSlash) {
						return `\/${implicitExcludePathRegexPattern}${pattern}`;
					}

					return pattern;
				});

			const addSlash = /^[?*]/.test(projectFilePath);

			const pattern = new RegExp(
				`^${escapeForRegexp(projectDirectory)}${addSlash ? '' : '\/'}${projectFilePathPattern}$`,
				regexpFlags,
			);

			return pattern;
		}) : undefined;

	const filesList = files?.map(file => path.join(projectDirectory, file));

	return function isMatch(
		filePath: string,
	): boolean {
		if (!filePath.startsWith('/')) {
			throw new Error('filePath must be absolute');
		}

		if (filesList?.includes(filePath)) {
			return true;
		}

		if (
			// Outside of project
			!filePath.startsWith(projectDirectory)

			// Invalid extension
			|| !extensions.some(extension => filePath.endsWith(extension))

			// Matches exclude
			|| excludePatterns.some(pattern => pattern.test(filePath))
		) {
			return false;
		}

		if (includePatterns) {
			return includePatterns.some(pattern => pattern.test(filePath));
		}

		return false;
	};
};
