import { readTsconfig } from '#get-tsconfig';
import {
	defineScenario,
	type BenchmarkScenario,
	type RegisteredBenchmarkScenario,
} from './types.ts';
import {
	setupBlockedExportsProject,
	setupNestedNodeModulesProject,
	setupPackageExportsMainProject,
	setupPackageExportsSubpathProject,
	setupPackageJsonTsconfigProject,
	setupPackageRootExtendsProject,
} from './fixtures.ts';

type ReadFixture = {
	tsconfigPath: string;
};

type ScenarioFactory = {
	id: string;
	name: string;
	prepare?: BenchmarkScenario<ReadFixture>['prepare'];
	expectThrow?: boolean;
	expectedErrorMessage?: string;
	minIterations?: number;
};

const shortMacroPlan = {
	type: 'adaptive',
	targetDurationMs: 750,
	minIterations: 250,
	maxIterations: 50_000,
	rounds: 7,
	warmupIterations: 25,
} as const;

const createReadScenario = (
	{
		id,
		name,
		prepare,
		expectThrow = false,
		expectedErrorMessage,
		minIterations = shortMacroPlan.minIterations,
	}: ScenarioFactory,
	cacheMode: 'fresh' | 'shared',
) => defineScenario({
	id: `${id}:${cacheMode}`,
	suite: 'package-extends',
	name: `${name} (${cacheMode} cache)`,
	version: 1,
	kind: 'macro' as const,
	note: expectThrow ? 'expected throw' : undefined,
	plan: {
		...shortMacroPlan,
		minIterations,
	},
	prepare: prepare ?? (() => {
		throw new Error(`Scenario ${id} is missing prepare().`);
	}),
	createRound: (fixture) => {
		const cache = new Map();

		const runRead = () => {
			if (cacheMode === 'shared') {
				readTsconfig(fixture.tsconfigPath, { cache });
				return;
			}

			readTsconfig(fixture.tsconfigPath);
		};

		return {
			run: () => {
				if (!expectThrow) {
					runRead();
					return;
				}

				try {
					runRead();
				} catch (error) {
					const message = error instanceof Error
						? error.message
						: String(error);
					if (
						expectedErrorMessage
						&& message !== expectedErrorMessage
					) {
						throw new Error(
							`Expected scenario ${id} to throw "${expectedErrorMessage}", got "${message}"`,
						);
					}

					return;
				}

				throw new Error(`Expected scenario ${id} to throw`);
			},
		};
	},
});

const createScenarioPair = (
	definition: ScenarioFactory,
) => [
	createReadScenario(definition, 'shared'),
	createReadScenario(definition, 'fresh'),
];

export const scenarios = [
	...createScenarioPair({
		id: 'package-root',
		name: 'readTsconfig (package root extends)',
		prepare: context => setupPackageRootExtendsProject(context),
	}),
	...createScenarioPair({
		id: 'package-exports-main',
		name: 'readTsconfig (package exports main)',
		prepare: context => setupPackageExportsMainProject(context),
	}),
	...createScenarioPair({
		id: 'package-exports-subpath',
		name: 'readTsconfig (package exports subpath)',
		prepare: context => setupPackageExportsSubpathProject(context),
	}),
	...createScenarioPair({
		id: 'package-json-tsconfig',
		name: 'readTsconfig (package.json#tsconfig)',
		prepare: context => setupPackageJsonTsconfigProject(context),
	}),
	...createScenarioPair({
		id: 'blocked-exports',
		name: 'readTsconfig (blocked exports)',
		prepare: context => setupBlockedExportsProject(context),
		expectThrow: true,
		expectedErrorMessage: 'File \'dep\' not found.',
		minIterations: 200,
	}),
	...createScenarioPair({
		id: 'nested-node-modules',
		name: 'readTsconfig (nested node_modules)',
		prepare: context => setupNestedNodeModulesProject(context),
	}),
] satisfies RegisteredBenchmarkScenario[];
