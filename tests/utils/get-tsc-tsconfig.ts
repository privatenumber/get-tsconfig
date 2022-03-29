import path from 'path';
import { execa } from 'execa';
import type { TsConfigJson } from 'type-fest';

const tscPath = path.resolve('node_modules/.bin/tsc');

export async function getTscConfig(
	cwd: string,
): Promise<TsConfigJson> {
	const tscProcess = await execa(
		tscPath,
		['--showConfig'],
		{ cwd },
	);

	return JSON.parse(tscProcess.stdout);
}
