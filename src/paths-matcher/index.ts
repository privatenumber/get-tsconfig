import path from 'node:path';
import slash from 'slash';
import type { TsConfigResult } from '../types.js';
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
) => {
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

	return (specifier: string) => {
		if (isRelativePathPattern.test(specifier)) {
			return [];
		}

		const patternPathEntries: PathEntry<StarPattern>[] = [];

		for (const pathEntry of pathEntries) {
			if (pathEntry.pattern === specifier) {
				return pathEntry.substitutions.map(slash);
			}

			if (typeof pathEntry.pattern !== 'string') {
				patternPathEntries.push(pathEntry as PathEntry<StarPattern>);
			}
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
			return (
				baseUrl && !paths
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
