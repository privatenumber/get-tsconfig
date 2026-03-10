import type { TsConfigJson, Except } from 'type-fest';

export type { TsConfigJson };

export type TsConfigJsonResolved = Except<TsConfigJson, 'extends'>;

export type TsConfigResult<Config = TsConfigJsonResolved> = {

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

export type PathsMatcher = (specifier: string) => string[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Cache<value = any> = Map<string, value>;
