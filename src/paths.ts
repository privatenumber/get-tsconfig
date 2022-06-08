import path from 'path';
import type { TsConfigResult } from './types';

type StarPattern = {
	prefix: string;
	suffix: string;
};

type PathEntry<T extends string | StarPattern> = {
	pattern: T;
	substitutions: string[];
};

const isRelativePathPattern = /^\.{1,2}\//;
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

function parsePattern(pattern: string) {
	if (pattern.includes('*')) {
		const [prefix, suffix] = pattern.split('*');
		return { prefix, suffix } as StarPattern;
	}

	return pattern;
}

function parsePaths(
	paths: Partial<Record<string, string[]>>,
	baseUrl: string | undefined,
	absoluteBaseUrl: string,
) {
	return Object.entries(paths).map(([pattern, substitutions]) => {
		assertStarCount(pattern, `Pattern '${pattern}' can have at most one '*' character.`);

		return {
			pattern: parsePattern(pattern),
			substitutions: substitutions!.map((substitution) => {
				assertStarCount(
					substitution,
					`Substitution '${substitution}' in pattern '${pattern}' can have at most one '*' character.`,
				);

				if (!substitution.startsWith('./') && !baseUrl) {
					throw new Error('Non-relative paths are not allowed when \'baseUrl\' is not set. Did you forget a leading \'./\'?');
				}

				return path.join(absoluteBaseUrl, substitution);
			}),
		} as PathEntry<string | StarPattern>;
	});
}

const isPatternMatch = (
	{ prefix, suffix }: StarPattern,
	candidate: string,
) => (
	candidate.length >= (prefix.length + suffix.length)
	&& candidate.startsWith(prefix)
	&& candidate.endsWith(suffix)
);

/**
 * Reference:
 * https://github.com/microsoft/TypeScript/blob/3ccbe804f850f40d228d3c875be952d94d39aa1d/src/compiler/moduleNameResolver.ts#L2465
 */
export function createPathsMatcher(
	tsconfig: TsConfigResult,
) {
	if (!tsconfig.config.compilerOptions?.paths) {
		return null;
	}

	const { baseUrl, paths } = tsconfig.config.compilerOptions;

	const resolvedBaseUrl = path.resolve(
		path.dirname(tsconfig.path),
		baseUrl || '.',
	);

	const pathEntries = parsePaths(paths, baseUrl, resolvedBaseUrl);

	return function pathsMatcher(specifier: string) {
		if (isRelativePathPattern.test(specifier)) {
			return [];
		}

		const patternPathEntries: PathEntry<StarPattern>[] = [];

		for (const pathEntry of pathEntries) {
			if (pathEntry.pattern === specifier) {
				return pathEntry.substitutions;
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
			return [];
		}

		const matchedPath = specifier.slice(
			matchedValue.pattern.prefix.length,
			specifier.length - matchedValue.pattern.suffix.length,
		);

		return matchedValue.substitutions.map(
			substitution => substitution.replace(starPattern, matchedPath),
		);
	};
}
