import { readTsconfig } from '#get-tsconfig';
import {
	defineScenario,
	type RegisteredBenchmarkScenario,
} from './types.ts';
import { setupMonorepo } from './fixtures.ts';

const packageCount = 200;

export const scenarios = [
	defineScenario({
		id: 'monorepo:read-tsconfig-shared-cache',
		suite: 'monorepo',
		name: 'readTsconfig (shared cache)',
		version: 1,
		kind: 'macro',
		note: `${packageCount} packages`,
		plan: {
			type: 'fixed',
			iterations: 10,
		},
		prepare: context => setupMonorepo(context, packageCount),
		createRound: (fixture) => {
			const cache = new Map();
			return {
				run: () => {
					cache.clear();
					for (const tsconfigPath of fixture.tsconfigPaths) {
						readTsconfig(tsconfigPath, { cache });
					}
				},
			};
		},
	}),
	defineScenario({
		id: 'monorepo:read-tsconfig-fresh-cache',
		suite: 'monorepo',
		name: 'readTsconfig (fresh cache)',
		version: 1,
		kind: 'macro',
		note: `${packageCount} packages`,
		plan: {
			type: 'fixed',
			iterations: 10,
		},
		prepare: context => setupMonorepo(context, packageCount),
		createRound: fixture => ({
			run: () => {
				for (const tsconfigPath of fixture.tsconfigPaths) {
					readTsconfig(tsconfigPath);
				}
			},
		}),
	}),
] satisfies RegisteredBenchmarkScenario[];
