import type { TsConfigJson, Except } from 'type-fest';

export type { TsConfigJson };

export type TsConfigJsonResolved = Except<TsConfigJson, 'extends'>;

export type TsConfigResult = {

	/**
	 * The path to the tsconfig.json file
	 */
	path: string;

	/**
	 * The resolved tsconfig.json file
	 */
	config: TsConfigJsonResolved;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Cache<value = any> = Map<string, value>;
