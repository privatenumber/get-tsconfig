import type { TsconfigJson } from '../types.js';
import { applyV4Defaults } from './v4.js';
import { applyV5Defaults } from './v5.js';
import { applyV6Defaults } from './v6.js';

/**
 * Applies the default-flips introduced in this TypeScript major.
 *
 * Receives the merged compiler options and the set of fields the user explicitly
 * set in their tsconfig (resolved across `extends`). Functions must overwrite
 * fields the user did *not* set, leaving user-set fields intact. Use:
 *
 *     if (!userSet.has(field)) compilerOptions[field] = value
 *
 * Do **not** use `??=`. Prior `vN` files may have already populated a field
 * with their own default; later majors must be able to overwrite that without
 * trampling the user's value.
 */
type ApplyVersionDefaults = (
	compilerOptions: TsconfigJson.CompilerOptions,
	userSet: ReadonlySet<string>,
) => void;

/**
 * Ordered list of TypeScript major versions and their default-flips.
 *
 * Cumulative semantics: the dispatcher applies every entry whose major is
 * less than or equal to the target version, in ascending order. Add a new
 * entry when a major version flips one or more unconditional defaults.
 *
 * --- Granularity audit (TS 4.0 → 6.0) ---
 *
 * We chose **major-only** granularity after auditing every minor in this
 * range (one tag per minor, diffing `_computedOptions`/the standalone
 * `getEmit*` helpers, `getStrictOptionValue`, `getCommonSourceDirectory`,
 * `getAutomaticTypeDirectiveNames`, and `defaultValueDescription`).
 *
 * Within-major *derivation-rule* changes — these belong in
 * `normalizeCompilerOptions`, not here:
 * - v4.4 → v4.5: `target` learns `module=Node12/NodeNext` derivation
 * - v4.5 → v4.6: `useDefineForClassFields` boundary `target===ESNext`
 *   ⇒ `target>=ES2022`
 * - v4.6 → v4.7: `Node12` renamed to `Node16`
 * - v5.3 → v5.4: `module=preserve` ⇒ `moduleResolution=bundler`
 * - v5.4 → v5.5: `target===ES3` silently treated as `undefined`
 * - v5.7 → v5.8: `module=Node18` derivation
 * - v5.8 → v5.9: `module=Node20` derivation, `resolveJsonModule` auto-true
 *   for `node20`
 *
 * Within-major *unconditional* default-flips — these are the only kind
 * that would warrant a sub-major file (none currently warrant one):
 * - v5.7 → v5.8: `libReplacement` option introduced with default `true`
 *   (then v6.0 flips it to `false`). For `typescriptVersion: '5.8.x'`/
 *   `'5.9.x'` we leave `libReplacement` `undefined` instead of TS's `true`.
 *   `libReplacement` is a build-performance flag rarely consulted; if it
 *   ever needs fidelity, add `v5.8.ts` and bump `parseMajor` →
 *   `parseVersion` (the dispatcher already supports the pattern).
 *
 * Things v6.0 *also* changed that we partially or don't model:
 * - `alwaysStrict` decoupled from strict-family — defaults to `true`
 *   unconditionally. We get this almost-right because our `strict: true`
 *   default cascades through `normalizeCompilerOptions`; the case it
 *   misses is `strict: false` + v6, where TS 6 still defaults
 *   `alwaysStrict: true`.
 * - `stableTypeOrdering` (default false) and `ignoreConfig` (default
 *   false) — diagnostic/migration flags, intentionally not modeled.
 *
 * To re-run this audit on a future major: extract these regions for one
 * tag per minor and diff adjacent minors. Source-of-truth files:
 * `src/compiler/utilities.ts` (`_computedOptions`), `commandLineParser.ts`
 * (`defaultValueDescription`), `emitter.ts` (`getCommonSourceDirectory`),
 * `moduleNameResolver.ts` (`getAutomaticTypeDirectiveNames`).
 */
const versionDeltas: ReadonlyArray<readonly [number, ApplyVersionDefaults]> = [
	[4, applyV4Defaults],
	[5, applyV5Defaults],
	[6, applyV6Defaults],
];

const parseMajor = (version: string): number | undefined => {
	const match = /^v?(\d+)/.exec(version);
	return match ? Number(match[1]) : undefined;
};

/**
 * Apply unconditional compiler-option defaults that TypeScript would synthesize
 * at runtime, based on the target TypeScript version.
 *
 * Distinct from the *derived* defaults handled by `normalizeCompilerOptions`
 * (e.g. `module: nodenext` ⇒ `moduleResolution: nodenext`), which are always
 * applied because they are internally consistent within a single tsconfig.
 *
 * Unconditional defaults are tied to the TypeScript version because the
 * compiler synthesizes them only when nothing is set, and those synthesized
 * values change between versions.
 *
 * @see https://gist.github.com/privatenumber/3d2e80da28f84ee30b77d53e1693378f
 */
export const applyVersionDefaults = (
	compilerOptions: TsconfigJson.CompilerOptions,
	typescriptVersion: string,
): void => {
	const major = parseMajor(typescriptVersion);
	if (major === undefined) {
		return;
	}

	// Snapshot the user's explicit fields *before* any deltas run, so later
	// majors can overwrite earlier majors' defaults without clobbering values
	// the user actually set.
	const userSet: ReadonlySet<string> = new Set(Object.keys(compilerOptions));

	for (const [version, apply] of versionDeltas) {
		if (version <= major) {
			apply(compilerOptions, userSet);
		}
	}
};
