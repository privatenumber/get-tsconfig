import path from 'node:path';
import fs from 'node:fs';
import {
	temporaryBase, writeJson, measure, type BenchmarkResult,
} from './utils.js';
import {
	getTsconfig,
	readTsconfig,
	isFileIncluded,
	resolvePathAlias,
} from '#get-tsconfig';

const setupSingleProject = () => {
	const projectDirectory = path.join(temporaryBase, 'single-project');
	writeJson(path.join(projectDirectory, 'base.json'), {
		compilerOptions: {
			target: 'es2022',
			module: 'node16',
			strict: true,
		},
	});
	writeJson(path.join(projectDirectory, 'tsconfig.json'), {
		extends: './base.json',
		compilerOptions: {
			baseUrl: '.',
			paths: {
				'@/*': ['./src/*'],
				'#utils/*': ['./utils/*'],
			},
			outDir: './dist',
			declaration: true,
		},
		include: ['src/**/*.ts', 'utils/**/*.ts'],
		exclude: ['node_modules', 'dist'],
	});
	fs.mkdirSync(path.join(projectDirectory, 'src'), { recursive: true });
	fs.writeFileSync(path.join(projectDirectory, 'src/index.ts'), '');
	fs.writeFileSync(path.join(projectDirectory, 'src/utils.ts'), '');
	return projectDirectory;
};

export const run = (): BenchmarkResult[] => {
	const projectDirectory = setupSingleProject();
	const tsconfigPath = path.join(projectDirectory, 'tsconfig.json');
	const sharedCache = new Map();

	const readShared = measure('readTsconfig (shared cache)', 500, () => {
		readTsconfig(tsconfigPath, sharedCache);
	});

	const readFresh = measure('readTsconfig (fresh cache)', 500, () => {
		readTsconfig(tsconfigPath);
	});

	const getShared = measure('getTsconfig (shared cache)', 500, () => {
		getTsconfig(projectDirectory, 'tsconfig.json', sharedCache);
	});

	const getFresh = measure('getTsconfig (fresh cache)', 500, () => {
		getTsconfig(projectDirectory);
	});

	const tsconfig = readTsconfig(tsconfigPath);
	const srcFile = path.join(projectDirectory, 'src/index.ts');

	const fileCached = measure('isFileIncluded (cached)', 100_000, () => {
		isFileIncluded(tsconfig, srcFile);
		isFileIncluded(tsconfig, '/nonexistent/file.ts');
	});

	// Pre-build distinct cloned inputs outside the timed region.
	// Each clone is a separate object so the cache can't reuse compiled state,
	// regardless of how the cache key strategy changes in the future.
	const freshFileIterations = 20_000;
	const freshFileConfigs = Array.from(
		{ length: freshFileIterations + 1 }, // +1 for warmup
		() => structuredClone(tsconfig),
	);
	let freshFileIndex = 0;
	const fileFresh = measure('isFileIncluded (fresh compile)', freshFileIterations, () => {
		const freshTsconfig = freshFileConfigs[freshFileIndex];
		freshFileIndex += 1;
		isFileIncluded(freshTsconfig, srcFile);
		isFileIncluded(freshTsconfig, '/nonexistent/file.ts');
	});

	const aliasCached = measure('resolvePathAlias (cached)', 100_000, () => {
		resolvePathAlias(tsconfig, '@/index');
		resolvePathAlias(tsconfig, '#utils/helper');
		resolvePathAlias(tsconfig, 'unmatched');
	});

	const freshAliasIterations = 20_000;
	const freshAliasConfigs = Array.from(
		{ length: freshAliasIterations + 1 },
		() => structuredClone(tsconfig),
	);
	let freshAliasIndex = 0;
	const aliasFresh = measure('resolvePathAlias (fresh compile)', freshAliasIterations, () => {
		const freshTsconfig = freshAliasConfigs[freshAliasIndex];
		freshAliasIndex += 1;
		resolvePathAlias(freshTsconfig, '@/index');
		resolvePathAlias(freshTsconfig, '#utils/helper');
		resolvePathAlias(freshTsconfig, 'unmatched');
	});

	return [
		readShared,
		readFresh,
		getShared,
		getFresh,
		fileCached,
		fileFresh,
		aliasCached,
		aliasFresh,
	];
};
