import type { TsconfigJson } from '../types.js';

/**
 * TypeScript 6.0 default-flips.
 *
 * Source-of-truth references are linked above each field. The narrative
 * summary lives in this gist:
 * https://gist.github.com/privatenumber/3d2e80da28f84ee30b77d53e1693378f
 *
 * Note on `module` / `moduleResolution`: in v6 these remain *derived* from
 * `target` (and from each other) — the values below are correct when the
 * v6 default `target: es2025` is also in effect (the most common path for
 * a parsed config). When the user sets a non-default `target`, the
 * cross-field derivation handled by `normalizeCompilerOptions` still
 * applies pre-v6 rules; refining that is tracked separately.
 */
export const applyV6Defaults = (
	compilerOptions: TsconfigJson.CompilerOptions,
	userSet: ReadonlySet<string>,
): void => {
	// strict: defaults to true (the implicit-strict flip).
	// `getStrictOptionValue` now treats `strict !== false` as truthy when
	// strict is unset — meaning each strict-family flag defaults to true.
	// https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/utilities.ts#L9369-L9371
	if (!userSet.has('strict')) {
		compilerOptions.strict = true;
	}

	// target: defaults to the latest stable ES year (es2025 in v6.0).
	// https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/utilities.ts#L9048-L9054
	if (!userSet.has('target')) {
		// type-fest does not yet model 'es2025'; cast through the union.
		compilerOptions.target = 'es2025' as TsconfigJson.CompilerOptions.Target;
	}

	// module: with target=es2025 (≥es2022), v6 derives module=es2022.
	// https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/utilities.ts#L9055-L9076
	if (!userSet.has('module')) {
		compilerOptions.module = 'es2022' as TsconfigJson.CompilerOptions.Module;
	}

	// moduleResolution: with module=es2022 (non-Node), v6 derives bundler.
	// https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/utilities.ts#L9077-L9098
	if (!userSet.has('moduleResolution')) {
		compilerOptions.moduleResolution = 'bundler' as TsconfigJson.CompilerOptions.ModuleResolution;
	}

	// rootDir: when a `configFilePath` is present (i.e. the user is parsing
	// a tsconfig), v6 always uses the tsconfig's directory as rootDir —
	// previously this only happened for `composite: true` projects.
	// https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/emitter.ts#L636-L666
	if (!userSet.has('rootDir')) {
		compilerOptions.rootDir = '.';
	}

	// types: defaults to [] (no @types auto-discovery). Auto-discovery is
	// now opt-in via `types: ["*"]`.
	// https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/moduleNameResolver.ts#L813-L816
	if (!userSet.has('types')) {
		compilerOptions.types = [];
	}

	// noUncheckedSideEffectImports: defaults to true.
	// https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/commandLineParser.ts#L1273-L1281
	if (!userSet.has('noUncheckedSideEffectImports')) {
		compilerOptions.noUncheckedSideEffectImports = true;
	}

	// libReplacement: defaults to false (was true in 5.x).
	// https://github.com/microsoft/TypeScript/blob/v6.0.3/src/compiler/commandLineParser.ts#L895-L901
	if (!userSet.has('libReplacement')) {
		compilerOptions.libReplacement = false;
	}
};
