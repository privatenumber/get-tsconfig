import path from 'node:path';
import slash from 'slash';
import type { TsConfigResult, PathsMatcher } from '../types.js';
import { isRelativePathPattern } from '../utils/is-relative-path-pattern.js';
import { implicitBaseUrlSymbol } from '../utils/constants.js';
import {
	assertStarCount,
	parsePattern,
	isPatternMatch,
} from './utils.js';
import type { StarPattern, PathEntry } from './types.js';

const parsePaths = (
	paths: Partial<Record<string, string[]>>,
	baseUrl: string | undefined,
	absoluteBaseUrl: string,
) => Object.entries(paths).map(([pattern, substitutions]) => {
	assertStarCount(pattern, `Pattern '${pattern}' can have at most one '*' character.`);

	return {
		pattern: parsePattern(pattern),
		substitutions: substitutions!.map((substitution) => {
			assertStarCount(
				substitution,
				`Substitution '${substitution}' in pattern '${pattern}' can have at most one '*' character.`,
			);

			if (!baseUrl && !isRelativePathPattern.test(substitution) && !path.isAbsolute(substitution)) {
				throw new Error('Non-relative paths are not allowed when \'baseUrl\' is not set. Did you forget a leading \'./\'?');
			}

			return path.resolve(absoluteBaseUrl, substitution);
		}),
	} as PathEntry<string | StarPattern>;
});

/**
 * Reference:
 * https://github.com/microsoft/TypeScript/blob/3ccbe804f850f40d228d3c875be952d94d39aa1d/src/compiler/moduleNameResolver.ts#L2465
 */
export const createPathsMatcher = (
	tsconfig: TsConfigResult,
): PathsMatcher | null => {
	const { compilerOptions } = tsconfig.config;
	if (!compilerOptions) {
		return null;
	}

	const { baseUrl, paths } = compilerOptions;
	if (!baseUrl && !paths) {
		return null;
	}

	const implicitBaseUrl = (
		implicitBaseUrlSymbol in compilerOptions
		&& (compilerOptions[implicitBaseUrlSymbol] as string)
	);

	const resolvedBaseUrl = path.resolve(
		path.dirname(tsconfig.path),
		baseUrl || implicitBaseUrl || '.',
	);

	const pathEntries = (
		paths
			? parsePaths(paths, baseUrl, resolvedBaseUrl)
			: []
	);

	// Split once so each call does a map lookup instead of a scan
	const exactPathEntries = new Map<string, PathEntry<string>>();
	const patternPathEntries: PathEntry<StarPattern>[] = [];
	for (const pathEntry of pathEntries) {
		if (typeof pathEntry.pattern === 'string') {
			if (!exactPathEntries.has(pathEntry.pattern)) {
				exactPathEntries.set(pathEntry.pattern, pathEntry as PathEntry<string>);
			}
		} else {
			patternPathEntries.push(pathEntry as PathEntry<StarPattern>);
		}
	}

	return (specifier: string) => {
		if (isRelativePathPattern.test(specifier)) {
			return [];
		}

		const exactPathEntry = exactPathEntries.get(specifier);
		if (exactPathEntry) {
			return exactPathEntry.substitutions.map(slash);
		}

		let matchedValue: PathEntry<StarPattern> | undefined;
		let longestMatchPrefixLength = -1;

		for (const pathEntry of patternPathEntries) {
			if (
				isPatternMatch(pathEntry.pattern, specifier)
				&& pathEntry.pattern.prefix.length > longestMatchPrefixLength
			) {
				longestMatchPrefixLength = pathEntry.pattern.prefix.length;
				matchedValue = pathEntry;
			}
		}

		if (!matchedValue) {
			/**
			 * TypeScript falls back to baseUrl when no paths pattern matches.
			 * These are separate resolution steps, not a fallback chain within paths.
			 *
			 * Reference: https://github.com/microsoft/TypeScript/blob/main/src/compiler/moduleNameResolver.ts#L1550-L1556
			 */
			return (
				baseUrl
					? [slash(path.join(resolvedBaseUrl, specifier))]
					: []
			);
		}

		const matchedPath = specifier.slice(
			matchedValue.pattern.prefix.length,
			specifier.length - matchedValue.pattern.suffix.length,
		);

		return matchedValue.substitutions.map(
			substitution => slash(substitution.replace('*', matchedPath)),
		);
	};
};
