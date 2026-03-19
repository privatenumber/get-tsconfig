import path from 'node:path';
import slash from 'slash';
import type { TsconfigResult } from './types.js';
import { implicitBaseUrlSymbol } from './utils/constants.js';
import { isRelativePathPattern } from './utils/path.js';

type StarPattern = {
	prefix: string;
	suffix: string;
};

type PathEntry<T extends string | StarPattern> = {
	pattern: T;
	substitutions: string[];
};

const starPattern = /\*/g;

const assertStarCount = (
	pattern: string,
	errorMessage: string,
) => {
	const starCount = pattern.match(starPattern);
	if (starCount && starCount.length > 1) {
		throw new Error(errorMessage);
	}
};

const parsePattern = (pattern: string) => {
	if (pattern.includes('*')) {
		const [prefix, suffix] = pattern.split('*');
		return {
			prefix,
			suffix,
		} as StarPattern;
	}

	return pattern;
};

const isPatternMatch = (
	{ prefix, suffix }: StarPattern,
	candidate: string,
) => (
	candidate.startsWith(prefix)
	&& candidate.endsWith(suffix)
);

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

type CompiledPaths = {
	exactEntries: Map<string, string[]>;
	patternEntries: PathEntry<StarPattern>[];
	resolvedBaseUrl: string;
	baseUrl: string | undefined;
} | null;

/**
 * Reference:
 * https://github.com/microsoft/TypeScript/blob/3ccbe804f850f40d228d3c875be952d94d39aa1d/src/compiler/moduleNameResolver.ts#L2465
 */
const compilePaths = (
	tsconfig: TsconfigResult,
): CompiledPaths => {
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

	const pathEntries = paths
		? parsePaths(paths, baseUrl, resolvedBaseUrl)
		: [];

	const exactEntries = new Map<string, string[]>();
	const patternEntries: PathEntry<StarPattern>[] = [];

	for (const entry of pathEntries) {
		if (typeof entry.pattern === 'string') {
			exactEntries.set(entry.pattern, entry.substitutions);
		} else {
			patternEntries.push(entry as PathEntry<StarPattern>);
		}
	}

	return {
		exactEntries,
		patternEntries,
		resolvedBaseUrl,
		baseUrl,
	};
};

const compiledCache = new WeakMap<TsconfigResult, CompiledPaths>();

/**
 * Resolves a specifier against a tsconfig's `compilerOptions.paths` mappings.
 *
 * Returns an array of possible file paths to check. Returns an empty
 * array when no `paths` are configured or no pattern matches.
 * Does not perform actual file resolution — compatible with any
 * file/build system resolver.
 *
 * Results are cached per tsconfig object. The tsconfig must not be
 * mutated after the first call.
 *
 * @param tsconfig - The resolved tsconfig to resolve against (treat as immutable).
 * @param specifier - The import specifier to resolve.
 * @returns Array of possible file paths, or empty array if no match.
 */
export const resolvePathAlias = (
	tsconfig: TsconfigResult,
	specifier: string,
): string[] => {
	let compiled = compiledCache.get(tsconfig);
	if (compiled === undefined) {
		compiled = compilePaths(tsconfig);
		compiledCache.set(tsconfig, compiled);
	}

	if (!compiled) {
		return [];
	}

	if (isRelativePathPattern.test(specifier)) {
		return [];
	}

	const {
		exactEntries, patternEntries, resolvedBaseUrl, baseUrl,
	} = compiled;

	const exactMatch = exactEntries.get(specifier);
	if (exactMatch) {
		return exactMatch.map(slash);
	}

	let matchedValue: PathEntry<StarPattern> | undefined;
	let longestMatchPrefixLength = -1;

	for (const pathEntry of patternEntries) {
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
