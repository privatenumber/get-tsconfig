import slash from 'slash';
import { isRelativePathPattern } from './is-relative-path-pattern.js';

export const normalizeRelativePath = (filePath: string) => {
	const normalizedPath = slash(filePath);
	return isRelativePathPattern.test(normalizedPath)
		? normalizedPath
		: `./${normalizedPath}`;
};
