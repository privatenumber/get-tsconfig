import path from 'path';
import {
	sys as tsSys,
	findConfigFile,
	readConfigFile,
	parseJsonConfigFileContent,
	ModuleKind,
	ModuleResolutionKind,
	JsxEmit,
	ImportsNotUsedAsValues,
	NewLineKind,
	ScriptTarget,
} from 'typescript';
import type { TsConfigJson, Except } from 'type-fest';
import type { ParsedCommandLine } from 'typescript';
import AggregateError from 'aggregate-error';

// Based on:
// https://github.com/microsoft/TypeScript/blob/82377825d73a22f09dd13d19f/src/server/protocol.ts#L3425
const reverseLookup = {
	importsNotUsedAsValues: ImportsNotUsedAsValues,
	jsx: JsxEmit,
	module: ModuleKind,
	moduleResolution: ModuleResolutionKind,
	newLine: NewLineKind,
	target: ScriptTarget,
};

function getRaw(this: TsConfigResult): Except<TsConfigJson, 'extends'> {
	const { raw, options } = this.parsed;

	const compilerOptions = { ...options };
	delete compilerOptions.configFilePath;

	// eslint-disable-next-line guard-for-in
	for (const key in reverseLookup) {
		const lookupMap = reverseLookup[key as keyof typeof reverseLookup];
		if (key in compilerOptions) {
			compilerOptions[key] = lookupMap[compilerOptions[key] as any];
		}
	}

	const result = {
		...raw,
		compilerOptions,
	};

	// Already flattened
	delete result.extends;

	return result;
}

type TsConfigResult = {
	/**
	 * The path to the tsconfig.json file
	 */
	path: string;

	/**
	 * The parsed tsconfig.json file
	 */
	parsed: ParsedCommandLine;

	getRaw: typeof getRaw;
};

const cache = new Map<string, TsConfigResult>();

/**
 * If a JSON file is passed in, it will parse that as tsconfig
 * If a non JSON file (directory or TS file) is passed in, it searches up for a tsconfig from there
 */
function getTsconfig(
	searchPath = process.cwd(),
) {
	let tsconfig = cache.get(searchPath);

	if (tsconfig) {
		return tsconfig;
	}

	const tsconfigPath = (
		searchPath.endsWith('.json')
			? searchPath
			: findConfigFile(searchPath, tsSys.fileExists, 'tsconfig.json')
	);

	if (!tsconfigPath) {
		throw new Error('Could not find a tsconfig.json file.');
	}

	tsconfig = cache.get(tsconfigPath);

	if (tsconfig) {
		return tsconfig;
	}

	const configFile = readConfigFile(tsconfigPath, tsSys.readFile);

	if (configFile.error?.messageText) {
		throw new Error(configFile.error.messageText.toString());
	}

	const parsedConfig = parseJsonConfigFileContent(
		configFile.config,
		tsSys,
		path.dirname(tsconfigPath),
	);

	if (parsedConfig.errors.length > 0) {
		throw new AggregateError(parsedConfig.errors.map(error => error.messageText));
	}

	const result: TsConfigResult = {
		path: tsconfigPath,
		parsed: parsedConfig,
		getRaw,
	};

	cache.set(searchPath, result);

	if (tsconfigPath !== searchPath) {
		cache.set(tsconfigPath, result);
	}

	return result;
}

export default getTsconfig;
