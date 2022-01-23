import {
	ModuleKind,
	ModuleResolutionKind,
	JsxEmit,
	ImportsNotUsedAsValues,
	NewLineKind,
	ScriptTarget,
} from 'typescript';
import type { TsConfigJson, Except } from 'type-fest';
import type { TsConfigResult } from './types';

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

export function getRaw(this: TsConfigResult): Except<TsConfigJson, 'extends'> {
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
