import type { TsConfigJson, Except } from 'type-fest';

export type { TsConfigJson as TsconfigJson };

export type TsconfigJsonResolved = Except<TsConfigJson, 'extends'>;

export type TsconfigResult<Config = TsconfigJsonResolved> = {

	/**
	 * Absolute path to the tsconfig.json file
	 */
	path: string;

	/**
	 * The tsconfig.json content. When using the default type parameter,
	 * this is the fully resolved config (extends merged, options normalized).
	 */
	config: Config;
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
