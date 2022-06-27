import path from 'path';
import fs from 'fs/promises';
import { execa } from 'execa';
import type { TsConfigJson } from 'type-fest';

const randomId = () => Math.random().toString(36).slice(2);

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


const resolveAttemptPattern = /^(File|Directory) '(.+)'/gm;

async function parseTscResolve(
	stdout: string,
	request: string,
) {
	const startMatched = stdout.match(new RegExp(`={8} Resolving module '${request}'`));
	const endMatched = stdout.match(new RegExp(`={8} Module name '${request}'`));
	const resolveLog = stdout.slice(startMatched!.index, endMatched!.index);
	const resolveAttempts = resolveLog.matchAll(resolveAttemptPattern);

	return Array.from(resolveAttempts).map((
		[, type, filePath]) => ({ type, filePath }),
	);
}


export async function getTscResolve(
	request: string,
	fixturePath: string,
) {
	const filePath = path.join(fixturePath, randomId() + '.ts');

	await Promise.all([
		fs.writeFile(
			filePath,
			`import '${request}'`,
		),

		// Create empty directory with name so it looks into files in directory
		// fs.mkdir(path.join(fixturePath, request)),
	]);

	let { stdout } = await execa(
		tscPath,
		[
			'--traceResolution',
			'--noEmit',
		],
		{ cwd: fixturePath },
	);

	const parsed = await parseTscResolve(stdout, request);
	
	await fs.rm(filePath, {
		force: true,
	});

	return parsed;
}
