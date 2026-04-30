import type { TsConfigJson, Except } from 'type-fest';

export type { TsConfigJson as TsconfigJson };

export type TsconfigJsonResolved = Except<TsConfigJson, 'extends'>;

export type TsconfigResult<Config = TsconfigJsonResolved> = {

	/**
	 * The tsconfig.json content. When using the default type parameter,
	 * this is the fully resolved config (extends merged, options normalized).
	 */
	config: Config;

	/**
	 * Absolute path to the tsconfig.json file
	 */
	path: string;

	/**
	 * Paths of all tsconfig files that contributed to this config (via `extends`).
	 * `sources[0]` is the root tsconfig (same as `.path`), followed by extended
	 * configs in resolution order.
	 *
	 * Only present on resolved results (not on intermediate chain entries).
	 */
	sources?: string[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TsconfigCache<value = any> = Map<string, value>;

/**
 * Source for the TypeScript version used to apply unconditional compiler-option
 * defaults (e.g. TS 6.0 introduces `moduleResolution: 'bundler'` as a default).
 *
 * - Omitted: no version-based defaults applied (back-compat).
 * - String (e.g. `'5.9.2'`, `'6.0.0'`): use this version explicitly.
 * - `'auto'`: walk up from the tsconfig directory to detect
 *   `node_modules/typescript/package.json`. If not found, no defaults are applied.
 */
// `string & {}` preserves the `'auto'` literal in IDE autocomplete while
// still accepting any version string (`'auto' | string` would widen to
// plain `string` and drop the suggestion).
//
// `false` opts out of version-aware defaults entirely — the parsed config
// reflects only what's literally in the file, no synthesized defaults.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type TypeScriptVersionOption = 'auto' | (string & {}) | false;

type TsconfigSearchOptions = {
	configName?: string;
	cache?: TsconfigCache;
	includes?: boolean;
};

export type FindTsconfigOptions = TsconfigSearchOptions;
export type GetTsconfigOptions = TsconfigSearchOptions & {
	typescriptVersion?: TypeScriptVersionOption;
};

type TsconfigCacheOptions = {
	cache?: TsconfigCache;
};

export type ReadTsconfigOptions = TsconfigCacheOptions & {
	typescriptVersion?: TypeScriptVersionOption;
};

export type ResolveExtendsChainOptions = {
	typescriptVersion?: TypeScriptVersionOption;
};

export type GetExtendsChainOptions = TsconfigCacheOptions;
