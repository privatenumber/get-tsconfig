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

type TsconfigSearchOptions = {
	configName?: string;
	cache?: TsconfigCache;
	includes?: boolean;
};

export type GetTsconfigOptions = TsconfigSearchOptions;
export type FindTsconfigOptions = TsconfigSearchOptions;

type TsconfigCacheOptions = {
	cache?: TsconfigCache;
};

export type ReadTsconfigOptions = TsconfigCacheOptions;
export type GetExtendsChainOptions = TsconfigCacheOptions;
