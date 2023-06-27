import slash from 'slash';
import { isRelativePathPattern } from './is-relative-path-pattern.js';

export const normalizePath = (filePath: string) => {
	const normalizedPath = slash(filePath);
	return isRelativePathPattern.test(normalizedPath)
		? normalizedPath
		: `./${normalizedPath}`;
};
