import path from 'node:path';
import slash from 'slash';
import { isFsCaseSensitive } from 'is-fs-case-sensitive';
import type { TsconfigJson, TsconfigResult } from './types.js';

const { join: pathJoin } = path.posix;

const baseExtensions = {
	ts: ['.ts', '.tsx', '.d.ts'],
	cts: ['.cts', '.d.cts'],
	mts: ['.mts', '.d.mts'],
};

const getSupportedExtensions = (
	compilerOptions: TsconfigJson['compilerOptions'],
) => {
	const ts = [...baseExtensions.ts];
	const cts = [...baseExtensions.cts];
	const mts = [...baseExtensions.mts];

	if (compilerOptions?.allowJs) {
		ts.push('.js', '.jsx');
		cts.push('.cjs');
		mts.push('.mjs');
	}

	return [
		...ts,
		...cts,
		...mts,
	];
};

// https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/commandLineParser.ts#L3014-L3016
const getDefaultExcludeSpec = (
	compilerOptions: TsconfigJson['compilerOptions'],
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

const escapeForRegexp = (string: string) => string.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const dependencyDirectories = ['node_modules', 'bower_components', 'jspm_packages'] as const;
const implicitExcludePathRegexPattern = `(?!(${dependencyDirectories.join('|')})(/|$))`;

/**
 *
 * File matchers
 * replace *, ?, and ** / with regex
 * https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8088
 *
 * getSubPatternFromSpec
 * https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8165
 *
 * matchFiles
 * https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8291
 *
 * getFileMatcherPatterns
 * https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8267
 */

/**
 * An "includes" path "foo" is implicitly a glob "foo/** /*" (without the space)
 * if its last component has no extension, and does not contain any glob characters itself.
 */
const isImplicitGlobPattern = /(?:^|\/)[^.*?]+$/;

const matchAllGlob = '**/*';

const anyCharacter = '[^/]';

const noPeriodOrSlash = '[^./]';

const isWindows = process.platform === 'win32';

type CompiledPatterns = {
	filesSet: Set<string> | undefined;
	extensions: string[];
	excludePatterns: RegExp[];
	includePatterns: RegExp[] | undefined;
};

const compilePatterns = (
	{
		config,
		path: tsconfigPath,
	}: TsconfigResult,
	caseSensitivePaths: boolean,
): CompiledPatterns => {
	if ('extends' in config) {
		throw new Error('tsconfig#extends must be resolved. Use getTsconfig or readTsconfig to resolve it.');
	}

	if (!path.isAbsolute(tsconfigPath)) {
		throw new Error('The tsconfig path must be absolute');
	}

	if (isWindows) {
		tsconfigPath = slash(tsconfigPath);
	}

	const projectDirectory = path.dirname(tsconfigPath);
	const {
		files, include, exclude, compilerOptions,
	} = config;
	const resolvePattern = (pattern: string) => (
		path.isAbsolute(pattern) ? pattern : pathJoin(projectDirectory, pattern)
	);
	const filesSet = files
		? new Set(files.map(resolvePattern))
		: undefined;
	const extensions = getSupportedExtensions(compilerOptions);
	const regexpFlags = caseSensitivePaths ? '' : 'i';

	/**
	 * Match entire directory for `exclude`
	 * https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8135
	 */
	const excludeSpec = exclude || getDefaultExcludeSpec(compilerOptions);
	const excludePatterns = excludeSpec
		.map((filePath) => {
			const projectFilePath = resolvePattern(filePath);
			const projectFilePathPattern = escapeForRegexp(projectFilePath)

				// Replace **/
				.replaceAll(String.raw`\*\*/`, '(.+/)?')

				// Replace *
				.replaceAll(String.raw`\*`, `${anyCharacter}*`)

				// Replace ?
				.replaceAll(String.raw`\?`, anyCharacter);

			return new RegExp(
				`^${projectFilePathPattern}($|/)`,
				regexpFlags,
			);
		});

	// https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/commandLineParser.ts#LL3020C29-L3020C47
	const includeSpec = (files || include) ? include : [matchAllGlob];
	const includePatterns = includeSpec
		? includeSpec.map((filePath) => {
			let projectFilePath = resolvePattern(filePath);

			// https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8178
			if (isImplicitGlobPattern.test(projectFilePath)) {
				projectFilePath = pathJoin(projectFilePath, matchAllGlob);
			}

			const projectFilePathPattern = escapeForRegexp(projectFilePath)

				// Replace /**
				.replaceAll(String.raw`/\*\*`, `(/${implicitExcludePathRegexPattern}${noPeriodOrSlash}${anyCharacter}*)*?`)

				// Replace *
				.replaceAll(/(\/)?\\\*/g, (_, hasSlash) => {
					const pattern = `(${noPeriodOrSlash}|(\\.(?!min\\.js$))?)*`;
					if (hasSlash) {
						return `/${implicitExcludePathRegexPattern}${noPeriodOrSlash}${pattern}`;
					}

					return pattern;
				})

				// Replace ?
				.replaceAll(/(\/)?\\\?/g, (_, hasSlash) => {
					const pattern = anyCharacter;
					if (hasSlash) {
						return `/${implicitExcludePathRegexPattern}${pattern}`;
					}

					return pattern;
				});

			return new RegExp(
				`^${projectFilePathPattern}$`,
				regexpFlags,
			);
		})
		: undefined;

	return {
		filesSet,
		extensions,
		excludePatterns,
		includePatterns,
	};
};

const patternCache = new WeakMap<TsconfigResult, CompiledPatterns>();

/**
 * Checks whether a file is included by a tsconfig's `files`, `include`,
 * and `exclude` settings.
 *
 * Case sensitivity is auto-detected from the filesystem, matching
 * TypeScript's behavior.
 *
 * The `filePath` must be absolute. Non-absolute paths return `false`.
 *
 * Compiled patterns are cached per tsconfig object. The tsconfig must
 * not be mutated after the first call — mutation will not invalidate
 * the cache and may return stale results.
 *
 * @param tsconfig - The resolved tsconfig to check against (treat as immutable).
 * @param filePath - Absolute path to the file.
 * @returns `true` if the file is included, `false` otherwise.
 */
export const isFileIncluded = (
	tsconfig: TsconfigResult,
	filePath: string,
): boolean => {
	if (!path.isAbsolute(filePath)) {
		return false;
	}

	if (isWindows) {
		filePath = slash(filePath);
	}

	let compiled = patternCache.get(tsconfig);
	if (!compiled) {
		compiled = compilePatterns(tsconfig, isFsCaseSensitive());
		patternCache.set(tsconfig, compiled);
	}

	const {
		filesSet,
		extensions,
		excludePatterns,
		includePatterns,
	} = compiled;

	if (filesSet?.has(filePath)) {
		return true;
	}

	if (
		// Invalid extension (case sensitive)
		!extensions.some(extension => filePath.endsWith(extension))

		// Matches exclude
		|| excludePatterns.some(pattern => pattern.test(filePath))
	) {
		return false;
	}

	if (
		includePatterns
		&& includePatterns.some(pattern => pattern.test(filePath))
	) {
		return true;
	}

	return false;
};
