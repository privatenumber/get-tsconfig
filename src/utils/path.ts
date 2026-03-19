import slash from 'slash';

// Only works on POSIX paths. Apply `slash` first.
export const isRelativePathPattern = /^\.{1,2}(\/.*)?$/;

export const normalizeRelativePath = (filePath: string) => {
	const normalizedPath = slash(filePath);
	return isRelativePathPattern.test(normalizedPath)
		? normalizedPath
		: `./${normalizedPath}`;
};
