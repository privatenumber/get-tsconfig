import { findConfigFile } from './utils/find-config-file';
import { readTsconfig } from './utils/read-tsconfig';

function getTsconfig(
	searchPath = process.cwd(),
	configName = 'tsconfig.json',
) {
	const configFile = findConfigFile(searchPath, configName);

	if (!configFile) {
		return null;
	}

	const config = readTsconfig(configFile);

	return {
		path: configFile,
		config,
	};
}

export default getTsconfig;
export * from './types';
