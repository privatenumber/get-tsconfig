import path from 'node:path';
import type { BenchmarkContext } from './types.ts';

const strictCompilerOptions = {
	target: 'es2022',
	module: 'node16',
	strict: true,
};

type SingleProjectFixture = {
	projectDirectory: string;
	tsconfigPath: string;
	srcFile: string;
	wildcardMatchSpecifier: string;
	exactMatchSpecifier: string;
	missSpecifier: string;
	excludedFile: string;
};

export const setupSingleProject = (
	context: BenchmarkContext,
	name: string,
): SingleProjectFixture => {
	const projectDirectory = context.makePath(name);
	context.writeJson(path.join(projectDirectory, 'base.json'), {
		compilerOptions: strictCompilerOptions,
	});
	context.writeJson(path.join(projectDirectory, 'tsconfig.json'), {
		extends: './base.json',
		compilerOptions: {
			baseUrl: '.',
			paths: {
				'@core': ['./src/index.ts'],
				'@/*': ['./src/*'],
				'#utils/*': ['./utils/*'],
			},
			outDir: './dist',
			declaration: true,
		},
		include: ['src/**/*.ts', 'utils/**/*.ts'],
		exclude: ['node_modules', 'dist'],
	});
	context.writeText(path.join(projectDirectory, 'src/index.ts'), '');
	context.writeText(path.join(projectDirectory, 'utils/helper.ts'), '');

	return {
		projectDirectory,
		tsconfigPath: path.join(projectDirectory, 'tsconfig.json'),
		srcFile: path.join(projectDirectory, 'src/index.ts'),
		wildcardMatchSpecifier: '#utils/helper',
		exactMatchSpecifier: '@core',
		missSpecifier: 'unmatched',
		excludedFile: path.join(projectDirectory, 'dist/generated.d.ts'),
	};
};

export const setupSearchProject = (
	context: BenchmarkContext,
) => {
	const fixture = setupSingleProject(context, 'search-paths');
	const deepFilePath = path.join(fixture.projectDirectory, 'nested/a/b/c/d/e/src/index.ts');
	context.writeText(deepFilePath, '');

	return {
		...fixture,
		deepFilePath,
	};
};

export const setupMonorepo = (
	context: BenchmarkContext,
	packageCount: number,
) => {
	const monorepoDirectory = context.makePath('monorepo');
	context.writeJson(path.join(monorepoDirectory, 'tsconfig.base.json'), {
		compilerOptions: {
			...strictCompilerOptions,
			declaration: true,
		},
	});

	for (let index = 0; index < packageCount; index += 1) {
		const packageDirectory = path.join(monorepoDirectory, 'packages', `pkg-${index}`);
		context.writeJson(path.join(packageDirectory, 'tsconfig.json'), {
			extends: '../../tsconfig.base.json',
			compilerOptions: {
				outDir: './dist',
			},
			include: ['src'],
		});
		context.writeText(path.join(packageDirectory, 'src/index.ts'), '');
	}

	return {
		monorepoDirectory,
		tsconfigPaths: Array.from(
			{ length: packageCount },
			(_, index) => path.join(monorepoDirectory, 'packages', `pkg-${index}`, 'tsconfig.json'),
		),
	};
};

export const setupLinearChain = (
	context: BenchmarkContext,
	depth: number,
) => {
	const directory = context.makePath('linear');

	for (let index = depth; index >= 0; index -= 1) {
		const config: Record<string, unknown> = {
			compilerOptions: { [`opt${index}`]: true },
		};
		if (index < depth) {
			config.extends = `./${index + 1}.json`;
		}
		context.writeJson(path.join(directory, `${index}.json`), config);
	}

	return path.join(directory, '0.json');
};

export const setupDiamondGraph = (
	context: BenchmarkContext,
	branchCount: number,
) => {
	const directory = context.makePath('diamond');

	context.writeJson(path.join(directory, 'base.json'), {
		compilerOptions: { strict: true },
	});

	const branches = Array.from({ length: branchCount }, (_, index) => {
		const name = `branch-${index}.json`;
		context.writeJson(path.join(directory, name), {
			extends: './base.json',
			compilerOptions: { [`branch${index}`]: true },
		});
		return `./${name}`;
	});

	context.writeJson(path.join(directory, 'root.json'), {
		extends: branches,
		compilerOptions: { root: true },
	});

	return path.join(directory, 'root.json');
};

const writePackageFixture = (
	context: BenchmarkContext,
	projectDirectory: string,
	packageFiles: Record<string, unknown | string>,
	rootExtends: string,
) => {
	for (const [relativePath, file] of Object.entries(packageFiles)) {
		const filePath = path.join(projectDirectory, relativePath);
		if (typeof file === 'string') {
			context.writeText(filePath, file);
		} else {
			context.writeJson(filePath, file);
		}
	}

	context.writeJson(path.join(projectDirectory, 'tsconfig.json'), {
		extends: rootExtends,
		compilerOptions: {
			outDir: './dist',
		},
		include: ['src'],
	});
	context.writeText(path.join(projectDirectory, 'src/index.ts'), '');

	return {
		projectDirectory,
		tsconfigPath: path.join(projectDirectory, 'tsconfig.json'),
	};
};

export const setupPackageRootExtendsProject = (
	context: BenchmarkContext,
) => writePackageFixture(
	context,
	context.makePath('package-root'),
	{
		'node_modules/dep/package.json': {
			name: 'dep',
		},
		'node_modules/dep/tsconfig.json': {
			compilerOptions: {
				...strictCompilerOptions,
				jsx: 'react',
			},
		},
	},
	'dep',
);

export const setupPackageExportsMainProject = (
	context: BenchmarkContext,
) => writePackageFixture(
	context,
	context.makePath('package-exports-main'),
	{
		'node_modules/dep/package.json': {
			name: 'dep',
			exports: './some-config.json',
		},
		'node_modules/dep/some-config.json': {
			compilerOptions: {
				...strictCompilerOptions,
				jsx: 'react',
			},
		},
		'node_modules/dep/tsconfig.json': {
			compilerOptions: {
				jsx: 'preserve',
			},
		},
	},
	'dep',
);

export const setupPackageExportsSubpathProject = (
	context: BenchmarkContext,
) => writePackageFixture(
	context,
	context.makePath('package-exports-subpath'),
	{
		'node_modules/dep/package.json': {
			name: 'dep',
			exports: {
				'./config': './some-config.json',
			},
		},
		'node_modules/dep/some-config.json': {
			compilerOptions: {
				...strictCompilerOptions,
				jsx: 'react',
			},
		},
	},
	'dep/config',
);

export const setupPackageJsonTsconfigProject = (
	context: BenchmarkContext,
) => writePackageFixture(
	context,
	context.makePath('package-json-tsconfig'),
	{
		'node_modules/dep/package.json': {
			name: 'dep',
			tsconfig: './some-config.json',
		},
		'node_modules/dep/some-config.json': {
			compilerOptions: {
				...strictCompilerOptions,
				jsx: 'react',
			},
		},
		'node_modules/dep/tsconfig.json': {
			compilerOptions: {
				jsx: 'preserve',
			},
		},
	},
	'dep',
);

export const setupBlockedExportsProject = (
	context: BenchmarkContext,
) => writePackageFixture(
	context,
	context.makePath('package-exports-blocked'),
	{
		'node_modules/dep/package.json': {
			name: 'dep',
			exports: {
				'./*': null,
			},
		},
		'node_modules/dep/tsconfig.json': {
			compilerOptions: {
				jsx: 'react-native',
			},
		},
	},
	'dep',
);

export const setupNestedNodeModulesProject = (
	context: BenchmarkContext,
) => {
	const workspaceDirectory = context.makePath('nested-node-modules');

	context.writeJson(path.join(workspaceDirectory, 'node_modules/dep/package.json'), {
		name: 'dep',
	});
	context.writeJson(path.join(workspaceDirectory, 'node_modules/dep/tsconfig.json'), {
		compilerOptions: {
			...strictCompilerOptions,
			jsx: 'react',
		},
	});
	context.writeJson(path.join(workspaceDirectory, 'packages/app/tsconfig.json'), {
		extends: 'dep',
		compilerOptions: {
			outDir: './dist',
		},
		include: ['src'],
	});
	context.writeText(path.join(workspaceDirectory, 'packages/app/src/index.ts'), '');

	return {
		projectDirectory: path.join(workspaceDirectory, 'packages/app'),
		tsconfigPath: path.join(workspaceDirectory, 'packages/app/tsconfig.json'),
	};
};
