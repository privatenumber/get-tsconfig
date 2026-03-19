import type { TsconfigResult } from '#get-tsconfig';

export const isWindows = process.platform === 'win32';
export const projectDir = isWindows ? 'C:/project' : '/project';
export const tsconfigPath = `${projectDir}/tsconfig.json`;

export const makeTsconfig = (config: Record<string, unknown> = {}): TsconfigResult => ({
	path: tsconfigPath,
	config: {
		compilerOptions: {},
		...config,
	},
});

export const file = (relativePath: string) => `${projectDir}/${relativePath}`;
