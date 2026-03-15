import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scenarios as extendsChainScenarios } from './extends-chain.ts';
import { scenarios as monorepoScenarios } from './monorepo.ts';
import { scenarios as packageExtendsScenarios } from './package-extends.ts';
import { scenarios as repeatedCallScenarios } from './repeated-calls.ts';
import { scenarios as searchPathScenarios } from './search-paths.ts';
import type { RegisteredBenchmarkScenario } from './types.ts';

export const scenarios: RegisteredBenchmarkScenario[] = [
	...repeatedCallScenarios,
	...searchPathScenarios,
	...packageExtendsScenarios,
	...monorepoScenarios,
	...extendsChainScenarios,
];

const benchmarkDirectory = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(benchmarkDirectory, '../..');
