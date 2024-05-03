import path from 'path';
import { promises as fs } from 'fs';
import { execa } from 'execa';
import type { TsConfigJson, PackageJson } from 'type-fest';

export const createTsconfigJson = (
	tsconfig: TsConfigJson,
) => JSON.stringify(tsconfig);

export const createPackageJson = (
	packageJson: PackageJson,
) => JSON.stringify(packageJson);

const randomId = () => Math.random().toString(36).slice(2);

const tscPath = path.resolve('node_modules/.bin/tsc');

export const getTscTsconfig = async (
	cwd: string,
): Promise<TsConfigJson> => {
	const tscProcess = await execa(
		tscPath,
		['--showConfig'],
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
