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

export type MatchOptions = {
	/**
	 * Fallback to joined path.
	 * @description Return `path.join(baseUrl, specifier)` if the specifier matches nothing
	 * @default true
	 */
	fallback?: boolean;
}
