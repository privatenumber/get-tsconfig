import type { TsConfigJson, Except } from 'type-fest';

export type { TsConfigJson };

export type TsConfigJsonResolved = Except<TsConfigJson, 'extends'>;

export type TsConfigResult = {
	/**
	 * The path to the tsconfig.json file
	 */
	path: string | undefined;

	/**
	 * The parsed tsconfig.json file
	 */
	 config: TsConfigJsonResolved;
};
