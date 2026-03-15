import { getExtendsChain, resolveExtendsChain } from '#get-tsconfig';
import {
	defineScenario,
	type RegisteredBenchmarkScenario,
} from './types.ts';
import { setupDiamondGraph, setupLinearChain } from './fixtures.ts';

const pureMergePlan = {
	type: 'adaptive',
	targetDurationMs: 350,
	maxIterations: 5000,
} as const;

export const scenarios = [
	defineScenario({
		id: 'extends-chain:get-linear-chain',
		suite: 'extends-chain',
		name: 'getExtendsChain (linear chain)',
		version: 1,
		kind: 'macro',
		plan: {
			type: 'fixed',
			iterations: 100,
		},
		prepare: context => ({
			tsconfigPath: setupLinearChain(context, 200),
		}),
		createRound: fixture => ({
			run: () => {
				getExtendsChain(fixture.tsconfigPath);
			},
		}),
	}),
	defineScenario({
		id: 'extends-chain:get-diamond-graph',
		suite: 'extends-chain',
		name: 'getExtendsChain (diamond graph)',
		version: 1,
		kind: 'macro',
		plan: {
			type: 'fixed',
			iterations: 100,
		},
		prepare: context => ({
			tsconfigPath: setupDiamondGraph(context, 200),
		}),
		createRound: fixture => ({
			run: () => {
				getExtendsChain(fixture.tsconfigPath);
			},
		}),
	}),
	defineScenario({
		id: 'extends-chain:resolve-linear-chain',
		suite: 'extends-chain',
		name: 'resolveExtendsChain (linear chain)',
		version: 1,
		kind: 'micro',
		plan: pureMergePlan,
		prepare: (context) => {
			const tsconfigPath = setupLinearChain(context, 200);
			return {
				chain: getExtendsChain(tsconfigPath),
			};
		},
		createRound: fixture => ({
			run: () => {
				resolveExtendsChain(fixture.chain);
			},
		}),
	}),
	defineScenario({
		id: 'extends-chain:resolve-diamond-graph',
		suite: 'extends-chain',
		name: 'resolveExtendsChain (diamond graph)',
		version: 1,
		kind: 'micro',
		plan: pureMergePlan,
		prepare: (context) => {
			const tsconfigPath = setupDiamondGraph(context, 200);
			return {
				chain: getExtendsChain(tsconfigPath),
			};
		},
		createRound: fixture => ({
			run: () => {
				resolveExtendsChain(fixture.chain);
			},
		}),
	}),
] satisfies RegisteredBenchmarkScenario[];
