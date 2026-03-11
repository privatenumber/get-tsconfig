import path from 'node:path';
import fs from 'node:fs';
import {
	temporaryBase, writeJson, measure, type BenchmarkResult,
} from './utils.js';
import { readTsconfig } from '#get-tsconfig';

const setupMonorepo = (packageCount: number) => {
	const monorepoDirectory = path.join(temporaryBase, 'monorepo');
	writeJson(path.join(monorepoDirectory, 'tsconfig.base.json'), {
		compilerOptions: {
			target: 'es2022',
			module: 'node16',
			strict: true,
			declaration: true,
		},
	});

	for (let i = 0; i < packageCount; i += 1) {
		const packageDirectory = path.join(monorepoDirectory, 'packages', `pkg-${i}`);
		writeJson(path.join(packageDirectory, 'tsconfig.json'), {
			extends: '../../tsconfig.base.json',
			compilerOptions: {
				outDir: './dist',
			},
			include: ['src'],
		});
		fs.mkdirSync(path.join(packageDirectory, 'src'), { recursive: true });
		fs.writeFileSync(path.join(packageDirectory, 'src/index.ts'), '');
	}

	return monorepoDirectory;
};

export const run = (): BenchmarkResult[] => {
	const packageCount = 200;
	const monorepoDirectory = setupMonorepo(packageCount);

	const tsconfigPaths = Array.from(
		{ length: packageCount },
		(_, i) => path.join(monorepoDirectory, 'packages', `pkg-${i}`, 'tsconfig.json'),
	);

	const sharedCache = new Map();

	// Warmup
	for (const tsconfigPath of tsconfigPaths) {
		readTsconfig(tsconfigPath);
	}

	const shared = measure('monorepo readTsconfig (shared cache)', 10, () => {
		sharedCache.clear();
		for (const tsconfigPath of tsconfigPaths) {
			readTsconfig(tsconfigPath, sharedCache);
		}
	});

	const fresh = measure('monorepo readTsconfig (fresh cache)', 10, () => {
		for (const tsconfigPath of tsconfigPaths) {
			readTsconfig(tsconfigPath);
		}
	});

	return [
		{
			...shared,
			note: `${packageCount} packages`,
		},
		{
			...fresh,
			note: `${packageCount} packages`,
		},
	];
};
