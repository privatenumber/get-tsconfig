import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import type {
	BenchmarkBundle,
	BenchmarkContext,
	BenchmarkComparison,
	BenchmarkComparisonValidation,
	BenchmarkEnvironment,
	BenchmarkPlan,
	BenchmarkResult,
	BenchmarkSample,
	RegisteredBenchmarkScenario,
	ResolvedBenchmarkPlan,
} from './types.ts';

const stabilityThresholdByKind = {
	macro: 15,
	micro: 10,
} as const;

const createBenchmarkContext = (
	repoRoot: string,
): BenchmarkContext => {
	const temporaryBase = fs.mkdtempSync(path.join(os.tmpdir(), 'get-tsconfig-bench-'));

	const writeText = (
		filePath: string,
		text: string,
	) => {
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, text);
	};

	return {
		repoRoot,
		temporaryBase,
		makePath: (...segments: string[]) => path.join(temporaryBase, ...segments),
		writeJson: (filePath: string, data: unknown) => {
			writeText(filePath, JSON.stringify(data));
		},
		writeText,
		cleanup: () => {
			fs.rmSync(temporaryBase, {
				recursive: true,
				force: true,
			});
		},
	};
};

const round = (
	number: number,
) => Math.round(number * 1000) / 1000;

const getMedian = (
	samples: number[],
) => {
	const sorted = [...samples].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 0) {
		return (sorted[middle - 1] + sorted[middle]) / 2;
	}

	return sorted[middle];
};

const getMean = (
	samples: number[],
) => samples.reduce((sum, value) => sum + value, 0) / samples.length;

const getRelativeStdDevPct = (
	samples: number[],
) => {
	const mean = getMean(samples);
	if (mean === 0) {
		return 0;
	}

	const variance = samples.reduce(
		(sum, value) => sum + ((value - mean) ** 2),
		0,
	) / samples.length;

	return (Math.sqrt(variance) / mean) * 100;
};

const getDefaultsForPlan = (
	plan: BenchmarkPlan,
	kind: RegisteredBenchmarkScenario['kind'],
) => ({
	rounds: plan.rounds ?? (kind === 'micro' ? 7 : 5),
	warmupIterations: plan.warmupIterations ?? (kind === 'micro' ? 3 : 1),
});

const timeRound = (
	run: () => void,
	iterations: number,
) => {
	const start = performance.now();
	for (let index = 0; index < iterations; index += 1) {
		run();
	}
	return performance.now() - start;
};

const noop = () => {};

const measureRoundTotals = (
	roundRunner: {
		run: () => void;
		baseline?: () => void;
	},
	iterations: number,
	warmupIterations: number,
	includeBaseline: boolean,
) => {
	for (let warmupIndex = 0; warmupIndex < warmupIterations; warmupIndex += 1) {
		roundRunner.run();
	}

	const rawTotalMs = timeRound(roundRunner.run, iterations);
	const baseline = roundRunner.baseline ?? noop;
	const baselineTotalMs = includeBaseline
		? (() => {
			for (let warmupIndex = 0; warmupIndex < warmupIterations; warmupIndex += 1) {
				baseline();
			}

			return timeRound(baseline, iterations);
		})()
		: undefined;

	return {
		rawTotalMs,
		baselineTotalMs,
		totalMs: Math.max(rawTotalMs - (baselineTotalMs ?? 0), 0),
	};
};

const resolveAdaptiveIterations = (
	scenario: RegisteredBenchmarkScenario,
	prepared: unknown,
	repoRoot: string,
) => {
	const defaults = getDefaultsForPlan(scenario.plan, scenario.kind);
	const { plan } = scenario;
	if (plan.type !== 'adaptive') {
		return plan.iterations;
	}

	const minIterations = plan.minIterations ?? 1;
	const maxIterations = plan.maxIterations ?? 1_000_000;
	let iterations = minIterations;
	let totalMs = 0;

	while (true) {
		const calibrationContext = createBenchmarkContext(repoRoot);
		const resolvedPlan: ResolvedBenchmarkPlan = {
			type: 'adaptive',
			iterations,
			rounds: defaults.rounds,
			warmupIterations: defaults.warmupIterations,
			note: plan.note,
			targetDurationMs: plan.targetDurationMs,
			minIterations,
			maxIterations,
		};
		const roundRunner = scenario.createRound(prepared, calibrationContext, resolvedPlan);

		try {
			totalMs = measureRoundTotals(
				roundRunner,
				iterations,
				resolvedPlan.warmupIterations,
				scenario.kind === 'micro',
			).totalMs;
		} finally {
			roundRunner.teardown?.();
			calibrationContext.cleanup();
		}

		if (
			totalMs >= plan.targetDurationMs / 2
			|| iterations >= maxIterations
		) {
			break;
		}

		iterations = Math.min(iterations * 2, maxIterations);
	}

	if (totalMs === 0) {
		return maxIterations;
	}

	const perIterationMs = totalMs / iterations;
	const estimatedIterations = Math.ceil(plan.targetDurationMs / perIterationMs);

	return Math.max(minIterations, Math.min(maxIterations, estimatedIterations));
};

const resolvePlan = <TPrepared>(
	scenario: RegisteredBenchmarkScenario,
	prepared: TPrepared,
	repoRoot: string,
): ResolvedBenchmarkPlan => {
	const defaults = getDefaultsForPlan(scenario.plan, scenario.kind);
	if (scenario.plan.type === 'fixed') {
		return {
			type: 'fixed',
			iterations: scenario.plan.iterations,
			rounds: defaults.rounds,
			warmupIterations: defaults.warmupIterations,
			note: scenario.plan.note,
		};
	}

	return {
		type: 'adaptive',
		iterations: resolveAdaptiveIterations(scenario, prepared, repoRoot),
		rounds: defaults.rounds,
		warmupIterations: defaults.warmupIterations,
		note: scenario.plan.note,
		targetDurationMs: scenario.plan.targetDurationMs,
		minIterations: scenario.plan.minIterations ?? 1,
		maxIterations: scenario.plan.maxIterations ?? 1_000_000,
	};
};

const measureScenarioRound = (
	scenario: RegisteredBenchmarkScenario,
	prepared: unknown,
	repoRoot: string,
	plan: ResolvedBenchmarkPlan,
	roundNumber: number,
): BenchmarkSample => {
	const roundContext = createBenchmarkContext(repoRoot);
	const roundRunner = scenario.createRound(prepared, roundContext, plan);

	try {
		const {
			rawTotalMs,
			baselineTotalMs,
			totalMs,
		} = measureRoundTotals(
			roundRunner,
			plan.iterations,
			plan.warmupIterations,
			scenario.kind === 'micro',
		);
		const operationsPerIteration = roundRunner.operationsPerIteration ?? 1;
		const totalOperations = plan.iterations * operationsPerIteration;

		return {
			round: roundNumber,
			totalMs: round(totalMs),
			rawTotalMs: round(rawTotalMs),
			baselineTotalMs: baselineTotalMs === undefined
				? undefined
				: round(baselineTotalMs),
			iterations: plan.iterations,
			operationsPerIteration,
			totalOperations,
			operationUs: round((totalMs / totalOperations) * 1000),
		};
	} finally {
		roundRunner.teardown?.();
		roundContext.cleanup();
	}
};

const getResultWarnings = (
	scenario: RegisteredBenchmarkScenario,
	relativeStdDevPct: number,
) => {
	const warnings: string[] = [];
	const threshold = stabilityThresholdByKind[scenario.kind];

	if (relativeStdDevPct > threshold) {
		warnings.push(
			`Relative standard deviation ${round(relativeStdDevPct)}% exceeds the ${scenario.kind} stability threshold of ${threshold}%.`,
		);
	}

	return warnings;
};

export const runScenario = (
	scenario: RegisteredBenchmarkScenario,
	repoRoot: string,
): BenchmarkResult => {
	const context = createBenchmarkContext(repoRoot);

	try {
		const prepared = scenario.prepare?.(context);
		const plan = resolvePlan(scenario, prepared, repoRoot);
		const samples = Array.from(
			{ length: plan.rounds },
			(_, roundIndex) => measureScenarioRound(
				scenario,
				prepared,
				repoRoot,
				plan,
				roundIndex + 1,
			),
		);

		const operationSamples = samples.map(sample => sample.operationUs);
		const totalSamples = samples.map(sample => sample.totalMs);
		const relativeStdDevPct = round(getRelativeStdDevPct(operationSamples));

		return {
			id: scenario.id,
			suite: scenario.suite,
			name: scenario.name,
			scenarioVersion: scenario.version,
			kind: scenario.kind,
			note: scenario.note ?? plan.note,
			warnings: getResultWarnings(
				scenario,
				relativeStdDevPct,
			),
			plan,
			medianTotalMs: round(getMedian(totalSamples)),
			medianOperationUs: round(getMedian(operationSamples)),
			meanOperationUs: round(getMean(operationSamples)),
			minOperationUs: round(Math.min(...operationSamples)),
			maxOperationUs: round(Math.max(...operationSamples)),
			relativeStdDevPct,
			samples,
		};
	} finally {
		context.cleanup();
	}
};

const tryExec = (
	command: string,
	args: string[],
	cwd: string,
) => {
	try {
		return execFileSync(command, args, {
			cwd,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
	} catch {
		return undefined;
	}
};

export const getEnvironmentMetadata = (
	repoRoot: string,
): BenchmarkEnvironment => {
	const packageJson = JSON.parse(
		fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
	) as {
		name: string;
		version: string;
	};

	const cpus = os.cpus();

	return {
		packageName: packageJson.name,
		packageVersion: packageJson.version,
		nodeVersion: process.version,
		platform: process.platform,
		arch: process.arch,
		cpuModel: cpus[0]?.model,
		cpuCount: cpus.length,
		totalMemoryBytes: os.totalmem(),
		gitBranch: tryExec('git', ['branch', '--show-current'], repoRoot),
		gitSha: tryExec('git', ['rev-parse', 'HEAD'], repoRoot),
		gitDirty: Boolean(tryExec('git', ['status', '--porcelain'], repoRoot)),
	};
};

export const createBenchmarkBundle = (
	selection: BenchmarkBundle['selection'],
	repoRoot: string,
	results: BenchmarkResult[],
): BenchmarkBundle => ({
	formatVersion: 1,
	generatedAt: new Date().toISOString(),
	selection,
	environment: getEnvironmentMetadata(repoRoot),
	results,
});

export const compareBundles = (
	current: BenchmarkBundle,
	baseline: BenchmarkBundle,
): BenchmarkComparison[] => {
	const baselineById = new Map(
		baseline.results.map(result => [result.id, result]),
	);

	return current.results.map((result) => {
		const baselineResult = baselineById.get(result.id);
		const deltaOperationUs = baselineResult
			? round(result.medianOperationUs - baselineResult.medianOperationUs)
			: undefined;

		return {
			id: result.id,
			name: result.name,
			suite: result.suite,
			kind: result.kind,
			currentMedianOperationUs: result.medianOperationUs,
			baselineMedianOperationUs: baselineResult?.medianOperationUs,
			deltaOperationUs,
			deltaPct: baselineResult
				&& baselineResult.medianOperationUs !== 0
				? round((deltaOperationUs! / baselineResult.medianOperationUs) * 100)
				: undefined,
		};
	});
};

const getScenarioVersionErrors = (
	current: BenchmarkBundle,
	baseline: BenchmarkBundle,
) => {
	const errors: string[] = [];
	const baselineById = new Map(
		baseline.results.map(result => [result.id, result]),
	);

	for (const result of current.results) {
		const baselineResult = baselineById.get(result.id);
		if (
			baselineResult
			&& result.scenarioVersion !== baselineResult.scenarioVersion
		) {
			errors.push(
				`Scenario "${result.id}" version mismatch: current is v${result.scenarioVersion}, baseline is ${baselineResult.scenarioVersion === undefined ? 'missing a scenario version' : `v${baselineResult.scenarioVersion}`}.`,
			);
		}
	}

	return errors;
};

const quotedList = (
	values: string[],
) => values.map(value => `"${value}"`).join(', ');

const pushMismatchError = (
	errors: string[],
	label: string,
	currentValue: string | number,
	baselineValue: string | number,
) => {
	if (currentValue !== baselineValue) {
		errors.push(
			`${label} mismatch: current is ${currentValue}, baseline is ${baselineValue}.`,
		);
	}
};

const getMissingScenarioIds = (
	current: BenchmarkBundle,
	baseline: BenchmarkBundle,
) => {
	const baselineIds = new Set(
		baseline.results.map(result => result.id),
	);
	return current.results
		.map(result => result.id)
		.filter(resultId => !baselineIds.has(resultId));
};

const getExtraScenarioIds = (
	current: BenchmarkBundle,
	baseline: BenchmarkBundle,
) => {
	const currentIds = new Set(
		current.results.map(result => result.id),
	);
	return baseline.results
		.map(result => result.id)
		.filter(resultId => !currentIds.has(resultId));
};

const getEnvironmentWarnings = (
	current: BenchmarkBundle,
	baseline: BenchmarkBundle,
) => {
	const warnings: string[] = [];

	if (current.environment.cpuModel !== baseline.environment.cpuModel) {
		warnings.push(
			`CPU model differs: current is ${current.environment.cpuModel ?? 'unknown'}, baseline is ${baseline.environment.cpuModel ?? 'unknown'}.`,
		);
	}

	if (current.environment.cpuCount !== baseline.environment.cpuCount) {
		warnings.push(
			`CPU core count differs: current is ${current.environment.cpuCount}, baseline is ${baseline.environment.cpuCount}.`,
		);
	}

	if (current.environment.totalMemoryBytes !== baseline.environment.totalMemoryBytes) {
		warnings.push(
			`System memory differs: current is ${current.environment.totalMemoryBytes} bytes, baseline is ${baseline.environment.totalMemoryBytes} bytes.`,
		);
	}

	if (current.environment.gitDirty || baseline.environment.gitDirty) {
		warnings.push(
			'One or both benchmark bundles were captured from a dirty git worktree.',
		);
	}

	return warnings;
};

const getSelectionWarnings = (
	current: BenchmarkBundle,
	baseline: BenchmarkBundle,
) => {
	const warnings: string[] = [];
	const selectionFields: Array<keyof BenchmarkBundle['selection']> = [
		'filter',
		'suites',
		'scenarios',
		'kinds',
	];

	for (const field of selectionFields) {
		const currentValue = JSON.stringify(current.selection[field]);
		const baselineValue = JSON.stringify(baseline.selection[field]);
		if (currentValue !== baselineValue) {
			warnings.push(
				`Selection field "${field}" differs between current and baseline bundles.`,
			);
		}
	}

	return warnings;
};

export const validateComparison = (
	current: BenchmarkBundle,
	baseline: BenchmarkBundle,
): BenchmarkComparisonValidation => {
	const errors: string[] = [];

	if (current.formatVersion !== baseline.formatVersion) {
		errors.push(
			`Bundle format mismatch: current is v${current.formatVersion}, baseline is v${baseline.formatVersion}.`,
		);
	}

	pushMismatchError(
		errors,
		'Package',
		current.environment.packageName,
		baseline.environment.packageName,
	);
	pushMismatchError(
		errors,
		'Node version',
		current.environment.nodeVersion,
		baseline.environment.nodeVersion,
	);
	pushMismatchError(
		errors,
		'Platform',
		current.environment.platform,
		baseline.environment.platform,
	);
	pushMismatchError(
		errors,
		'Architecture',
		current.environment.arch,
		baseline.environment.arch,
	);

	const missingScenarioIds = getMissingScenarioIds(current, baseline);
	if (missingScenarioIds.length > 0) {
		errors.push(
			`Baseline is missing ${missingScenarioIds.length} current scenario(s): ${quotedList(missingScenarioIds)}.`,
		);
	}
	errors.push(...getScenarioVersionErrors(current, baseline));

	const extraBaselineScenarioIds = getExtraScenarioIds(current, baseline);
	const warnings = getEnvironmentWarnings(current, baseline);
	warnings.push(...getSelectionWarnings(current, baseline));
	if (extraBaselineScenarioIds.length > 0) {
		warnings.push(
			`Baseline includes ${extraBaselineScenarioIds.length} additional scenario(s) not present in the current run: ${quotedList(extraBaselineScenarioIds)}.`,
		);
	}

	return {
		errors,
		warnings,
	};
};
