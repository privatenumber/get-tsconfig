import path from 'node:path';
import { promises as fs } from 'node:fs';
import { execa } from 'execa';
import type { TsConfigJson } from 'type-fest';

const randomId = () => Math.random().toString(36).slice(2);

const tscPath = path.resolve('node_modules/.bin/tsc');

export const getTscTsconfig = async (
	cwd: string,
	tsconfigPath?: string,
): Promise<TsConfigJson> => {
	const tscArgs = ['--showConfig'];

	if (tsconfigPath) {
		tscArgs.push('--project', tsconfigPath);
	}

	const tscProcess = await execa(
		tscPath,
		tscArgs,
		{ cwd },
	);

	return JSON.parse(tscProcess.stdout);
};

const resolveAttemptPattern = /^(File|Directory) '(.+)'/gm;

const divider = '='.repeat(8);

const parseTscResolve = async (
	stdout: string,
	request: string,
) => {
	const resolveLog = stdout.slice(
		stdout.indexOf(`${divider} Resolving module '${request}'`),
		stdout.indexOf(`${divider} Module name '${request}'`),
	);
	const resolveAttempts = resolveLog.matchAll(resolveAttemptPattern);

	return Array.from(resolveAttempts).map((
		[, type, filePath],
	) => ({
		type,
		filePath,
	}));
};

export const getTscResolution = async (
	request: string,
	fixturePath: string,
) => {
	const filePath = path.join(fixturePath, `${randomId()}.ts`);

	await fs.writeFile(filePath, `import '${request}'`);

	const { stdout } = await execa(
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
};
