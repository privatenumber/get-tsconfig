import slash from 'slash';

export const normalizePath = (filePath: string) => slash(
	/^[./]/.test(filePath)
		? filePath
		: `./${filePath}`,
);
