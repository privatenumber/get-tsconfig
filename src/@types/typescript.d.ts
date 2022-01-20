import type {
	CompilerOptions,
	ScriptTarget,
	ModuleKind,
	ModuleResolutionKind,
} from 'typescript';

declare module 'typescript' {
	export function getEmitScriptTarget(options: CompilerOptions): ScriptTarget;
	export function getEmitModuleKind(options: CompilerOptions): ModuleKind;
	export function getEmitModuleResolutionKind(options: CompilerOptions): ModuleResolutionKind;
	export function getESModuleInterop(options: CompilerOptions): boolean;
	export function getAllowSyntheticDefaultImports(options: CompilerOptions): boolean;
	export function shouldPreserveConstEnums(options: CompilerOptions): boolean;
	export function getStrictOptionValue(options: CompilerOptions, propertyName: string): boolean;
	export function getUseDefineForClassFields(options: CompilerOptions): boolean;
}
