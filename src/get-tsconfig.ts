import { findUp } from './utils/find-up';
import { readTsconfig } from './utils/read-tsconfig';
import type { TsConfigResult } from './types';

export function getTsconfig(
	searchPath = process.cwd(),
	configName = 'tsconfig.json',
): TsConfigResult | null {
	const configFile = findUp(searchPath, configName);

	if (!configFile) {
		return null;
	}

	const config = readTsconfig(configFile);

	return {
		path: configFile,
		config,
	};
}
