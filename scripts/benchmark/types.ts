export type BenchmarkKind = 'macro' | 'micro';

type SharedBenchmarkPlan = {
	rounds?: number;
	warmupIterations?: number;
	note?: string;
};

export type FixedBenchmarkPlan = SharedBenchmarkPlan & {
	type: 'fixed';
	iterations: number;
};

export type AdaptiveBenchmarkPlan = SharedBenchmarkPlan & {
	type: 'adaptive';
	targetDurationMs: number;
	minIterations?: number;
	maxIterations?: number;
};

export type BenchmarkPlan = FixedBenchmarkPlan | AdaptiveBenchmarkPlan;

export type ResolvedBenchmarkPlan = {
	type: BenchmarkPlan['type'];
	iterations: number;
	rounds: number;
	warmupIterations: number;
	note?: string;
	targetDurationMs?: number;
	minIterations?: number;
	maxIterations?: number;
};

export type BenchmarkRound = {
	operationsPerIteration?: number;
	baseline?: () => void;
	run: () => void;
	teardown?: () => void;
};

export type BenchmarkContext = {
	repoRoot: string;
	temporaryBase: string;
	makePath: (...segments: string[]) => string;
	writeJson: (filePath: string, data: unknown) => void;
	writeText: (filePath: string, text: string) => void;
	cleanup: () => void;
};

export type BenchmarkScenario<TPrepared = void> = {
	id: string;
	suite: string;
	name: string;
	version: number;
	kind: BenchmarkKind;
	note?: string;
	plan: BenchmarkPlan;
	prepare?: (
		context: BenchmarkContext,
	) => TPrepared;
	createRound: (
		prepared: TPrepared,
		context: BenchmarkContext,
		plan: ResolvedBenchmarkPlan,
	) => BenchmarkRound;
};

export type RegisteredBenchmarkScenario = BenchmarkScenario<unknown>;

export const defineScenario = <TPrepared>(
	scenario: BenchmarkScenario<TPrepared>,
) => scenario as RegisteredBenchmarkScenario;

export type BenchmarkSample = {
	round: number;
	totalMs: number;
	rawTotalMs: number;
	baselineTotalMs?: number;
	iterations: number;
	operationsPerIteration: number;
	totalOperations: number;
	operationUs: number;
};

export type BenchmarkResult = {
	id: string;
	suite: string;
	name: string;
	scenarioVersion: number;
	kind: BenchmarkKind;
	note?: string;
	warnings: string[];
	plan: ResolvedBenchmarkPlan;
	medianTotalMs: number;
	medianOperationUs: number;
	meanOperationUs: number;
	minOperationUs: number;
	maxOperationUs: number;
	relativeStdDevPct: number;
	samples: BenchmarkSample[];
};

export type BenchmarkSelection = {
	filter: string[];
	suites: string[];
	scenarios: string[];
	kinds: BenchmarkKind[];
};

export type BenchmarkEnvironment = {
	packageName: string;
	packageVersion: string;
	nodeVersion: string;
	platform: NodeJS.Platform;
	arch: NodeJS.Architecture;
	cpuModel?: string;
	cpuCount: number;
	totalMemoryBytes: number;
	gitBranch?: string;
	gitSha?: string;
	gitDirty?: boolean;
};

export type BenchmarkBundle = {
	formatVersion: 1;
	generatedAt: string;
	selection: BenchmarkSelection;
	environment: BenchmarkEnvironment;
	results: BenchmarkResult[];
};

export type BenchmarkComparison = {
	id: string;
	name: string;
	suite: string;
	kind: BenchmarkKind;
	currentMedianOperationUs: number;
	baselineMedianOperationUs?: number;
	deltaOperationUs?: number;
	deltaPct?: number;
};

export type BenchmarkComparisonValidation = {
	errors: string[];
	warnings: string[];
};

export type BenchmarkComparisonMetadata = {
	baselineGeneratedAt: string;
	baselineEnvironment: BenchmarkEnvironment;
	warnings: string[];
};
