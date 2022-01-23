import {
	ModuleKind,
	ModuleResolutionKind,
	JsxEmit,
	ImportsNotUsedAsValues,
	NewLineKind,
	ScriptTarget,
	getEmitScriptTarget,
	getEmitModuleKind,
	getEmitModuleResolutionKind,
	getESModuleInterop,
	getAllowSyntheticDefaultImports,
	shouldPreserveConstEnums,
	getStrictOptionValue,
	getUseDefineForClassFields,
	getEffectiveTypeRoots,
	getAutomaticTypeDirectiveNames,
	createCompilerHost,
} from 'typescript';
import type { CompilerOptions } from 'typescript';
import type { TsConfigJson, Except } from 'type-fest';
import type { TsConfigResult } from './types';

function applyCompilerOptionsDefaults(compilerOptions: CompilerOptions) {
	compilerOptions.target = getEmitScriptTarget(compilerOptions);

	compilerOptions.useDefineForClassFields = getUseDefineForClassFields(compilerOptions);

	compilerOptions.module = getEmitModuleKind(compilerOptions);

	compilerOptions.moduleResolution = getEmitModuleResolutionKind(compilerOptions);

	compilerOptions.esModuleInterop = getESModuleInterop(compilerOptions);

	compilerOptions.allowSyntheticDefaultImports = getAllowSyntheticDefaultImports(compilerOptions);

	// https://www.typescriptlang.org/tsconfig#declaration
	compilerOptions.declaration = compilerOptions.declaration ?? compilerOptions.composite;

	compilerOptions.incremental = compilerOptions.incremental ?? compilerOptions.composite;

	compilerOptions.preserveConstEnums = shouldPreserveConstEnums(compilerOptions);

	// https://www.typescriptlang.org/tsconfig#reactNamespace
	compilerOptions.reactNamespace = compilerOptions.reactNamespace ?? 'React';

	// https://www.typescriptlang.org/tsconfig#jsxFactory
	compilerOptions.jsxFactory = compilerOptions.jsxFactory ?? `${compilerOptions.reactNamespace}.createElement`;

	// https://www.typescriptlang.org/tsconfig#jsxImportSource
	compilerOptions.jsxImportSource = compilerOptions.jsxImportSource ?? 'react';

	// https://www.typescriptlang.org/tsconfig#generateCpuProfile
	compilerOptions.generateCpuProfile = compilerOptions.generateCpuProfile ?? 'profile.cpuprofile';

	// https://www.typescriptlang.org/tsconfig#tsBuildInfoFile
	compilerOptions.tsBuildInfoFile = compilerOptions.tsBuildInfoFile ?? '.tsbuildinfo';

	// Strict
	compilerOptions.alwaysStrict = getStrictOptionValue(compilerOptions, 'alwaysStrict');
	compilerOptions.strictNullChecks = getStrictOptionValue(compilerOptions, 'strictNullChecks');
	compilerOptions.strictBindCallApply = getStrictOptionValue(compilerOptions, 'strictBindCallApply');
	compilerOptions.strictFunctionTypes = getStrictOptionValue(compilerOptions, 'strictFunctionTypes');
	compilerOptions.strictPropertyInitialization = getStrictOptionValue(compilerOptions, 'strictPropertyInitialization');
	compilerOptions.noImplicitAny = getStrictOptionValue(compilerOptions, 'noImplicitAny');
	compilerOptions.noImplicitThis = getStrictOptionValue(compilerOptions, 'noImplicitThis');
	compilerOptions.useUnknownInCatchVariables = getStrictOptionValue(compilerOptions, 'useUnknownInCatchVariables');

	// rootDir
	// rootDirs

	const host = createCompilerHost(compilerOptions);
	compilerOptions.typeRoots = getEffectiveTypeRoots(compilerOptions, host);
	compilerOptions.types = getAutomaticTypeDirectiveNames(compilerOptions, host);
}

enum ScriptTargetPatch {
	ESNext = 99
}

// Based on:
// https://github.com/microsoft/TypeScript/blob/82377825d73a22f09dd13d19f/src/server/protocol.ts#L3425
const reverseLookup = {
	importsNotUsedAsValues: ImportsNotUsedAsValues,
	jsx: JsxEmit,
	module: ModuleKind,
	moduleResolution: ModuleResolutionKind,
	newLine: NewLineKind,
	target: {
		...ScriptTarget,
		...ScriptTargetPatch,
	},
};

type TsconfigResolved = Except<TsConfigJson, 'extends'>;

export function getRaw(
	this: TsConfigResult,
	withDefault = false,
): TsconfigResolved {
	const compilerOptions: CompilerOptions = {};
	const result: TsConfigJson = {};

	if (this.parsed) {
		const { raw, options } = this.parsed;
		Object.assign(result, raw);
		Object.assign(compilerOptions, options);
		delete compilerOptions.configFilePath;
	}

	if (withDefault) {
		applyCompilerOptionsDefaults(compilerOptions);
	}

	// eslint-disable-next-line guard-for-in
	for (const key in reverseLookup) {
		const lookupMap = reverseLookup[key as keyof typeof reverseLookup];
		if (key in compilerOptions) {
			compilerOptions[key] = lookupMap[compilerOptions[key] as any];
		}
	}

	// Already flattened
	delete result.extends;

	if (Object.keys(compilerOptions).length > 0) {
		result.compilerOptions = compilerOptions as TsConfigJson.CompilerOptions;
	}

	result.include = result.include ?? (result.files ? [] : ['**/*']);

	return result;
}
