import slash from 'slash';
import { isRelativePathPattern } from './is-relative-path-pattern.js';

export const normalizePath = (filePath: string) => slash(
	isRelativePathPattern.test(filePath)
		? filePath
		: `./${filePath}`,
);
