import { findUp } from './utils/find-up.js';
import { parseTsconfig } from './parse-tsconfig/index.js';
import type { TsConfigResult } from './types.js';

export function getTsconfig(
	searchPath = process.cwd(),
	configName = 'tsconfig.json',
): TsConfigResult | null {
	const configFile = findUp(searchPath, configName);

	if (!configFile) {
		return null;
	}

	const config = parseTsconfig(configFile);

	return {
		path: configFile,
		config,
	};
}
