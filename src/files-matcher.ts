import path from 'path';
import slash from 'slash';
import type { TsConfigJson } from 'type-fest';
import { isFsCaseSensitive } from 'is-fs-case-sensitive';
import type { TsConfigResult, TsConfigJsonResolved } from './types.js';

export type FileMatcher = (filePath: string) => (TsConfigJsonResolved | undefined);

const { join: pathJoin } = path.posix;

const baseExtensions = {
	ts: ['.ts', '.tsx', '.d.ts'],
	cts: ['.cts', '.d.cts'],
	mts: ['.mts', '.d.mts'],
};

const getSupportedExtensions = (
	compilerOptions: TsConfigJson['compilerOptions'],
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

const escapeForRegexp = (string: string) => string.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

export const createFilesMatcher = (
	{
		config,
		path: tsconfigPath,
	}: TsConfigResult,
	caseSensitivePaths = isFsCaseSensitive(),
): FileMatcher => {
	if ('extends' in config) {
		throw new Error('tsconfig#extends must be resolved. Use getTsconfig or parseTsconfig to resolve it.');
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
	const filesList = files?.map(file => pathJoin(projectDirectory, file));
	const extensions = getSupportedExtensions(compilerOptions);
	const regexpFlags = caseSensitivePaths ? '' : 'i';

	/**
	 * Match entire directory for `exclude`
	 * https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8135
	 */
	const excludeSpec = exclude || getDefaultExcludeSpec(compilerOptions);
	const excludePatterns = excludeSpec
		.map((filePath) => {
			const projectFilePath = pathJoin(projectDirectory, filePath);
			const projectFilePathPattern = escapeForRegexp(projectFilePath)

				// Replace **/
				.replaceAll('\\*\\*/', '(.+/)?')

				// Replace *
				.replaceAll('\\*', `${anyCharacter}*`)

				// Replace ?
				.replaceAll('\\?', anyCharacter);

			return new RegExp(
				`^${projectFilePathPattern}($|/)`,
				regexpFlags,
			);
		});

	// https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/commandLineParser.ts#LL3020C29-L3020C47
	const includeSpec = (files || include) ? include : [matchAllGlob];
	const includePatterns = includeSpec
		? includeSpec.map((filePath) => {
			let projectFilePath = pathJoin(projectDirectory, filePath);

			// https://github.com/microsoft/TypeScript/blob/acf854b636e0b8e5a12c3f9951d4edfa0fa73bcd/src/compiler/utilities.ts#L8178
			if (isImplicitGlobPattern.test(projectFilePath)) {
				projectFilePath = pathJoin(projectFilePath, matchAllGlob);
			}

			const projectFilePathPattern = escapeForRegexp(projectFilePath)

				// Replace /**
				.replaceAll('/\\*\\*', `(/${implicitExcludePathRegexPattern}${noPeriodOrSlash}${anyCharacter}*)*?`)

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

	return (
		filePath: string,
	) => {
		if (!path.isAbsolute(filePath)) {
			throw new Error('filePath must be absolute');
		}

		if (isWindows) {
			filePath = slash(filePath);
		}

		if (filesList?.includes(filePath)) {
			return config;
		}

		if (

			// Invalid extension (case sensitive)
			!extensions.some(extension => filePath.endsWith(extension))

			// Matches exclude
			|| excludePatterns.some(pattern => pattern.test(filePath))
		) {
			return;
		}

		if (
			includePatterns
			&& includePatterns.some(pattern => pattern.test(filePath))
		) {
			return config;
		}
	};
};
