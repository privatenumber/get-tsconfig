import type { TsconfigJson } from '../types.js';

/**
 * TypeScript 4.x unconditional defaults.
 *
 * Almost everything TS 4 synthesizes is *derived* from other options
 * (`module` from `target`, `moduleResolution` from `module`, etc.) — those
 * derivations are handled by `normalizeCompilerOptions` and are not encoded
 * here. Only fields with a true unconditional fallback live in this file.
 */
export const applyV4Defaults = (
	compilerOptions: TsconfigJson.CompilerOptions,
	userSet: ReadonlySet<string>,
): void => {
	// target: ES3 fallback only when no module dictates a different target.
	// In v4, `module: 'node16'` ⇒ ES2022 and `module: 'nodenext'` ⇒ ESNext;
	// we let `normalizeCompilerOptions` derive those from module. We only
	// inject the bare ES3 fallback when neither side has set a hint.
	// https://github.com/microsoft/TypeScript/blob/v4.9.5/src/compiler/utilities.ts#L6361-L6366
	if (!userSet.has('target') && !moduleDictatesTarget(compilerOptions.module)) {
		compilerOptions.target = 'es3';
	}
};

const moduleDictatesTarget = (
	module: TsconfigJson.CompilerOptions.Module | undefined,
): boolean => (
	module === 'node16'
	|| module === 'node18'
	|| module === 'node20'
	|| module === 'nodenext'
);
