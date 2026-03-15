import {
	getTsconfig,
	readTsconfig,
	isFileIncluded,
	resolvePathAlias,
	type TsconfigResult,
} from '#get-tsconfig';
import {
	defineScenario,
	type RegisteredBenchmarkScenario,
} from './types.ts';
import { setupSingleProject } from './fixtures.ts';

const createFreshTsconfig = (
	tsconfig: TsconfigResult,
): TsconfigResult => ({ ...tsconfig });

const microPlan = {
	type: 'adaptive',
	targetDurationMs: 250,
	maxIterations: 500_000,
} as const;

const shortMacroPlan = {
	type: 'adaptive',
	targetDurationMs: 350,
	minIterations: 500,
	maxIterations: 20_000,
} as const;

export const scenarios = [
	defineScenario({
		id: 'repeated-calls:read-tsconfig-shared-cache',
		suite: 'repeated-calls',
		name: 'readTsconfig (shared cache)',
		version: 1,
		kind: 'macro',
		plan: shortMacroPlan,
		prepare: context => setupSingleProject(context, 'repeated-calls-read-shared'),
		createRound: (fixture) => {
			const cache = new Map();
			return {
				run: () => {
					readTsconfig(fixture.tsconfigPath, { cache });
				},
			};
		},
	}),
	defineScenario({
		id: 'repeated-calls:read-tsconfig-fresh-cache',
		suite: 'repeated-calls',
		name: 'readTsconfig (fresh cache)',
		version: 1,
		kind: 'macro',
		plan: shortMacroPlan,
		prepare: context => setupSingleProject(context, 'repeated-calls-read-fresh'),
		createRound: fixture => ({
			run: () => {
				readTsconfig(fixture.tsconfigPath);
			},
		}),
	}),
	defineScenario({
		id: 'repeated-calls:get-tsconfig-shared-cache',
		suite: 'repeated-calls',
		name: 'getTsconfig (shared cache)',
		version: 1,
		kind: 'macro',
		plan: shortMacroPlan,
		prepare: context => setupSingleProject(context, 'repeated-calls-get-shared'),
		createRound: (fixture) => {
			const cache = new Map();
			return {
				run: () => {
					getTsconfig(fixture.projectDirectory, { cache });
				},
			};
		},
	}),
	defineScenario({
		id: 'repeated-calls:get-tsconfig-fresh-cache',
		suite: 'repeated-calls',
		name: 'getTsconfig (fresh cache)',
		version: 1,
		kind: 'macro',
		plan: shortMacroPlan,
		prepare: context => setupSingleProject(context, 'repeated-calls-get-fresh'),
		createRound: fixture => ({
			run: () => {
				getTsconfig(fixture.projectDirectory);
			},
		}),
	}),
	defineScenario({
		id: 'repeated-calls:is-file-included-cached-hit',
		suite: 'repeated-calls',
		name: 'isFileIncluded (cached hit)',
		version: 1,
		kind: 'micro',
		plan: microPlan,
		prepare: (context) => {
			const fixture = setupSingleProject(context, 'repeated-calls-file-hit');
			return {
				...fixture,
				tsconfig: readTsconfig(fixture.tsconfigPath),
			};
		},
		createRound: fixture => ({
			run: () => {
				isFileIncluded(fixture.tsconfig, fixture.srcFile);
			},
		}),
	}),
	defineScenario({
		id: 'repeated-calls:is-file-included-cached-miss',
		suite: 'repeated-calls',
		name: 'isFileIncluded (cached miss)',
		version: 1,
		kind: 'micro',
		plan: microPlan,
		prepare: (context) => {
			const fixture = setupSingleProject(context, 'repeated-calls-file-miss');
			return {
				...fixture,
				tsconfig: readTsconfig(fixture.tsconfigPath),
			};
		},
		createRound: fixture => ({
			run: () => {
				isFileIncluded(fixture.tsconfig, fixture.excludedFile);
			},
		}),
	}),
	defineScenario({
		id: 'repeated-calls:is-file-included-fresh-object-hit',
		suite: 'repeated-calls',
		name: 'isFileIncluded (fresh object hit)',
		version: 1,
		kind: 'micro',
		note: 'new TsconfigResult object each iteration',
		plan: {
			...microPlan,
			maxIterations: 50_000,
		},
		prepare: (context) => {
			const fixture = setupSingleProject(context, 'repeated-calls-file-fresh');
			return {
				...fixture,
				tsconfig: readTsconfig(fixture.tsconfigPath),
			};
		},
		createRound: fixture => ({
			run: () => {
				isFileIncluded(createFreshTsconfig(fixture.tsconfig), fixture.srcFile);
			},
		}),
	}),
	defineScenario({
		id: 'repeated-calls:resolve-path-alias-cached-exact',
		suite: 'repeated-calls',
		name: 'resolvePathAlias (cached exact match)',
		version: 1,
		kind: 'micro',
		plan: microPlan,
		prepare: (context) => {
			const fixture = setupSingleProject(context, 'repeated-calls-alias-exact');
			return {
				...fixture,
				tsconfig: readTsconfig(fixture.tsconfigPath),
			};
		},
		createRound: fixture => ({
			run: () => {
				resolvePathAlias(fixture.tsconfig, fixture.exactMatchSpecifier);
			},
		}),
	}),
	defineScenario({
		id: 'repeated-calls:resolve-path-alias-cached-pattern',
		suite: 'repeated-calls',
		name: 'resolvePathAlias (cached pattern match)',
		version: 1,
		kind: 'micro',
		plan: microPlan,
		prepare: (context) => {
			const fixture = setupSingleProject(context, 'repeated-calls-alias-pattern');
			return {
				...fixture,
				tsconfig: readTsconfig(fixture.tsconfigPath),
			};
		},
		createRound: fixture => ({
			run: () => {
				resolvePathAlias(fixture.tsconfig, fixture.wildcardMatchSpecifier);
			},
		}),
	}),
	defineScenario({
		id: 'repeated-calls:resolve-path-alias-cached-miss',
		suite: 'repeated-calls',
		name: 'resolvePathAlias (cached miss)',
		version: 1,
		kind: 'micro',
		plan: microPlan,
		prepare: (context) => {
			const fixture = setupSingleProject(context, 'repeated-calls-alias-miss');
			return {
				...fixture,
				tsconfig: readTsconfig(fixture.tsconfigPath),
			};
		},
		createRound: fixture => ({
			run: () => {
				resolvePathAlias(fixture.tsconfig, fixture.missSpecifier);
			},
		}),
	}),
	defineScenario({
		id: 'repeated-calls:resolve-path-alias-fresh-object-pattern',
		suite: 'repeated-calls',
		name: 'resolvePathAlias (fresh object pattern match)',
		version: 1,
		kind: 'micro',
		note: 'new TsconfigResult object each iteration',
		plan: {
			...microPlan,
			maxIterations: 100_000,
		},
		prepare: (context) => {
			const fixture = setupSingleProject(context, 'repeated-calls-alias-fresh');
			return {
				...fixture,
				tsconfig: readTsconfig(fixture.tsconfigPath),
			};
		},
		createRound: fixture => ({
			run: () => {
				resolvePathAlias(createFreshTsconfig(fixture.tsconfig), fixture.wildcardMatchSpecifier);
			},
		}),
	}),
] satisfies RegisteredBenchmarkScenario[];
