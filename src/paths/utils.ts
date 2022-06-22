import type { StarPattern } from './types';

export const isRelativePathPattern = /^\.{1,2}(\/.*)?$/;

const starPattern = /\*/g;

export const assertStarCount = (
	pattern: string,
	errorMessage: string,
) => {
	const starCount = pattern.match(starPattern);
	if (starCount && starCount.length > 1) {
		throw new Error(errorMessage);
	}
};

export function parsePattern(pattern: string) {
	if (pattern.includes('*')) {
		const [prefix, suffix] = pattern.split('*');
		return { prefix, suffix } as StarPattern;
	}

	return pattern;
}

export const isPatternMatch = (
	{ prefix, suffix }: StarPattern,
	candidate: string,
) => (
	candidate.startsWith(prefix)
	&& candidate.endsWith(suffix)
);
