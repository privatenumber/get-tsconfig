import type { TsconfigJson } from '../types.js';

/**
 * TypeScript 5.x unconditional defaults.
 *
 * The only delta from v4 is the `target` fallback bumping from ES3 to ES5.
 * All module/moduleResolution/strict behaviour is unchanged in TS 5 and
 * still flows through the existing derivation logic in
 * `normalizeCompilerOptions`.
 *
 * Known within-major gap (intentionally unmodeled): `libReplacement` was
 * introduced in TS 5.8 with `defaultValueDescription: true`, then flipped
 * to `false` in v6.0. See the granularity-audit notes in `./index.ts` for
 * why we don't carry it here.
 */
export const applyV5Defaults = (
	compilerOptions: TsconfigJson.CompilerOptions,
	userSet: ReadonlySet<string>,
): void => {
	// target: ES5 fallback (was ES3 in v4) — but only when module doesn't
	// dictate a different target. v5 derives target from `module: 'node16'`
	// (ES2022), `'node18'` (ES2022), `'node20'` (ES2023), `'nodenext'`
	// (ESNext); `normalizeCompilerOptions` handles those derivations, so we
	// must not preempt them with ES5.
	// https://github.com/microsoft/TypeScript/blob/v5.9.3/src/compiler/utilities.ts#L8969-L8980
	if (!userSet.has('target') && !moduleDictatesTarget(compilerOptions.module)) {
		compilerOptions.target = 'es5';
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
