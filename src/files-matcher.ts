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

	if (compilerOptions?.resolveJsonModule) {
		extensions.push('.json');
	}

	return extensions;
};

const escapeForRegexp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 *
 * File matchers
 * replace *, ?, and ** / with regex
 * https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8088
*/
function replaceWildcardCharacter(match: string, singleAsteriskRegexFragment: string) {
	return (
		match === '*'
			? singleAsteriskRegexFragment
			: (
				match === '?'
					? '[^/]'
					: `\\${match}`
			)
	);
}

/**
 * Test
 * - node_modules, bower_components, jspm_packages are excluded
 * .min.js files are excluded
 *
 */

const commonPackageFolders = ['node_modules', 'bower_components', 'jspm_packages'] as const;

const implicitExcludePathRegexPattern = `(?!(${commonPackageFolders.join('|')})(/|$))`;

const filesMatcher = {
	singleAsteriskRegexFragment: '([^./]|(\\.(?!min\\.js$))?)*',
	doubleAsteriskRegexFragment: `(/${implicitExcludePathRegexPattern}[^/.][^/]*)*?`,
	replaceWildcardCharacter: (match: string) => replaceWildcardCharacter(match, filesMatcher.singleAsteriskRegexFragment),
};

const directoriesMatcher = {
	singleAsteriskRegexFragment: '[^/]*',
	/**
     * Regex for the ** wildcard. Matches any number of subdirectories. When used for including
     * files or directories, does not match subdirectories that start with a . character
     */
	doubleAsteriskRegexFragment: `(/${implicitExcludePathRegexPattern}[^/.][^/]*)*?`,
	replaceWildcardCharacter: (match: string) => replaceWildcardCharacter(match, directoriesMatcher.singleAsteriskRegexFragment),
};

const excludeMatcher = {
	singleAsteriskRegexFragment: '[^/]*',
	doubleAsteriskRegexFragment: '(/.+?)?',
	replaceWildcardCharacter: (match: string) => replaceWildcardCharacter(match, excludeMatcher.singleAsteriskRegexFragment),
};

const wildcardMatchers = {
	files: filesMatcher,
	directories: directoriesMatcher,
	exclude: excludeMatcher,
};

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

const isImplicitGlobPattern = /\/[^.*?]+$/;

const matchAllGlob = '**/*';

export const createFilesMatcher = (
	{ config, path: tsconfigPath }: TsConfigResult,
	useCaseSensitiveFileNames = false,
) => {
	const projectDirectory = path.dirname(tsconfigPath);
	const {
		files, include, exclude, compilerOptions,
	} = config;

	// TODO: Support "references"
	// https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/commandLineParser.ts#L2984

	const excludeSpec = exclude || getDefaultExcludeSpec(compilerOptions);

	// https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/commandLineParser.ts#LL3020C29-L3020C47
	// TODO: handle "files"
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

				// Directory
				.replace(/\\\*\\\*\//g, '(.+/)?')

				// Wild card star
				.replace(/\\\*/g, '[^/]*') // '[^/]*')

				// Replace ?
				.replace(/\\\?/, '[^/]');

			// console.log(21212, projectFilePathPattern);

			return new RegExp(
				`^${projectFilePathPattern}($|/)`,
				regexpFlags,
			);
		});

	const includePatterns = includeSpec ? includeSpec
		.map((filePath) => {
			let projectFilePath = path.join(
				projectDirectory,
				filePath,
			);

			// https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8178
			if (isImplicitGlobPattern.test(projectFilePath)) {
				projectFilePath += `/${matchAllGlob}`;
			}

			const projectFilePathPattern = escapeForRegexp(projectFilePath)

				// Directory
				.replace(/\\\*\\\*\//g, '(.+/)?')

				// Wild card star
				.replace(/\\\*/g, '([^./]|(\\.(?!min\\.js$))?)*') // '[^/]*')

				// Replace ?
				.replace(/\\\?/, '[^/]');

			const pattern = new RegExp(
				`^${projectFilePathPattern}$`,
				regexpFlags,
			);

			// console.log({
			// 	filePath,
			// 	projectFilePath,
			// 	projectFilePathPattern,
			// 	pattern,
			// });

			return pattern;
		}) : undefined;

	const filesList = files?.map(file => path.join(projectDirectory, file));

	// console.log(1231231, 'get-tsconfig', {
	// 	files,
	// 	excludeSpec,
	// 	excludePatterns,
	// 	includeSpec,
	// 	supportedExtensions: getSupportedExtensions(compilerOptions),
	// });

	return function isMatch(
		filePath: string,
	): boolean {
		if (!filePath.startsWith('/')) {
			throw new Error('filePath must be absolute');
		}

		if (!filePath.startsWith(projectDirectory)) {
			return false;
		}
		// console.log({
		// 	filePath,
		// 	filesList,
		// 	includePatterns,
		// 	excludePatterns,
		// });

		const matchesExtension = extensions.find(extension => filePath.endsWith(extension));
		if (!matchesExtension) {
			return false;
		}

		if (excludePatterns.some(pattern => pattern.test(filePath))) {
			return false;
		}

		if (filesList?.includes(filePath)) {
			return true;
		}

		if (includePatterns) {
			return includePatterns.some(pattern => pattern.test(filePath));
		}

		return false;
	};
};
