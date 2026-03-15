import { findTsconfig, getTsconfig } from '#get-tsconfig';
import {
	defineScenario,
	type RegisteredBenchmarkScenario,
} from './types.ts';
import { setupSearchProject } from './fixtures.ts';

const searchMacroPlan = {
	type: 'adaptive',
	targetDurationMs: 2000,
	minIterations: 3000,
	maxIterations: 10_000,
	rounds: 7,
	warmupIterations: 50,
} as const;

export const scenarios = [
	defineScenario({
		id: 'search-paths:find-deep-file-path',
		suite: 'search-paths',
		name: 'findTsconfig (deep file path)',
		version: 1,
		kind: 'macro',
		plan: searchMacroPlan,
		prepare: context => setupSearchProject(context),
		createRound: fixture => ({
			run: () => {
				findTsconfig(fixture.deepFilePath);
			},
		}),
	}),
	defineScenario({
		id: 'search-paths:get-deep-file-path',
		suite: 'search-paths',
		name: 'getTsconfig (deep file path)',
		version: 1,
		kind: 'macro',
		plan: searchMacroPlan,
		prepare: context => setupSearchProject(context),
		createRound: fixture => ({
			run: () => {
				getTsconfig(fixture.deepFilePath);
			},
		}),
	}),
	defineScenario({
		id: 'search-paths:find-includes',
		suite: 'search-paths',
		name: 'findTsconfig (includes)',
		version: 1,
		kind: 'macro',
		plan: searchMacroPlan,
		prepare: context => setupSearchProject(context),
		createRound: fixture => ({
			run: () => {
				findTsconfig(fixture.srcFile, { includes: true });
			},
		}),
	}),
	defineScenario({
		id: 'search-paths:get-includes',
		suite: 'search-paths',
		name: 'getTsconfig (includes)',
		version: 1,
		kind: 'macro',
		plan: searchMacroPlan,
		prepare: context => setupSearchProject(context),
		createRound: fixture => ({
			run: () => {
				getTsconfig(fixture.srcFile, { includes: true });
			},
		}),
	}),
	defineScenario({
		id: 'search-paths:get-explicit-tsconfig-path',
		suite: 'search-paths',
		name: 'getTsconfig (explicit tsconfig path)',
		version: 1,
		kind: 'macro',
		plan: searchMacroPlan,
		prepare: context => setupSearchProject(context),
		createRound: fixture => ({
			run: () => {
				getTsconfig(fixture.tsconfigPath);
			},
		}),
	}),
] satisfies RegisteredBenchmarkScenario[];
