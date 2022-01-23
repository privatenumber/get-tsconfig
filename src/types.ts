import type { ParsedCommandLine } from 'typescript';
import { getRaw } from './get-raw';

export type TsConfigResult = {
	/**
	 * The path to the tsconfig.json file
	 */
	path: string | undefined;

	/**
	 * The parsed tsconfig.json file
	 */
	parsed: ParsedCommandLine;

	getRaw: typeof getRaw;
};
