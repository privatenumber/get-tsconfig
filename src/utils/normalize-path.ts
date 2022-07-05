import { isRelativePathPattern } from './is-relative-path-pattern';
import slash from 'slash';

export const normalizePath = (filePath: string) => slash(
	isRelativePathPattern.test(filePath)
		? filePath
		: `./${filePath}`,
);
