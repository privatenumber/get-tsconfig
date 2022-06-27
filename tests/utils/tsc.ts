import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { execa } from 'execa';
import type { TsConfigJson } from 'type-fest';

const randomId = () => Math.random().toString(36).slice(2);
const temporaryDirectory = path.join(os.tmpdir(), 'get-tsconfig', randomId());

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


export async function getTscResolve(
	request: string,
	tsconfig: TsConfigJson,
) {
	const directoryPath = path.join(temporaryDirectory, randomId());
	await fs.mkdir(directoryPath, {
		recursive: true,
	});

	await Promise.all([
		fs.writeFile(
			path.join(directoryPath, 'tsconfig.json'),
			JSON.stringify(tsconfig),
		),
		fs.writeFile(
			path.join(directoryPath, 'index.ts'),
			`import '${request}';`,
		),
		fs.mkdir(
			path.join(directoryPath, request),
		),
	]);

	const tscProcess = await execa(
		tscPath,
		['--traceResolution', '--noEmit'],
		{ cwd: directoryPath },
	);

	console.log(tscProcess);
	
	await fs.rm(directoryPath, {
		recursive: true,
		force: true,
	});
}
