import { findUp } from './utils/find-up';
import { parseTsconfig } from './parse-tsconfig';
import type { TsConfigResult } from './types';

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
