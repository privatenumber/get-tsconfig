import type {
	BenchmarkBundle,
	BenchmarkComparison,
	BenchmarkComparisonMetadata,
	BenchmarkResult,
} from './types.ts';

const formatDelta = (
	comparison?: BenchmarkComparison,
) => {
	if (
		!comparison
		|| comparison.deltaPct === undefined
		|| comparison.deltaOperationUs === undefined
	) {
		return 'n/a';
	}

	const sign = comparison.deltaPct > 0 ? '+' : '';
	return `${sign}${comparison.deltaPct}%`;
};

const formatSuiteName = (
	result: BenchmarkResult,
) => `${result.suite}/${result.kind}`;

const formatScenarioName = (
	result: Pick<BenchmarkResult, 'name' | 'note' | 'warnings'>,
) => (
	`${result.note
		? `${result.name} (${result.note})`
		: result.name}${result.warnings.length > 0 ? ' [warn]' : ''}`
);

const formatEnvironment = (
	environment: BenchmarkBundle['environment'],
) => (
	`${environment.nodeVersion} | ${environment.platform}/${environment.arch} | CPU: ${environment.cpuModel ?? 'unknown'} (${environment.cpuCount})`
);

export const formatBundle = (
	bundle: BenchmarkBundle,
	comparisons?: BenchmarkComparison[],
	comparisonMetadata?: BenchmarkComparisonMetadata,
) => {
	const comparisonById = comparisons
		? new Map(comparisons.map(comparison => [comparison.id, comparison]))
		: new Map<string, BenchmarkComparison>();

	const lines = [
		`Generated: ${bundle.generatedAt}`,
		`Node: ${formatEnvironment(bundle.environment)}`,
		`Git: ${bundle.environment.gitSha ?? 'unknown'}${bundle.environment.gitDirty ? ' (dirty)' : ''}`,
	];

	if (comparisonMetadata) {
		lines.push(
			`Compared To: ${comparisonMetadata.baselineGeneratedAt}`,
			`Baseline: ${formatEnvironment(comparisonMetadata.baselineEnvironment)}`,
			`Baseline Git: ${comparisonMetadata.baselineEnvironment.gitSha ?? 'unknown'}${comparisonMetadata.baselineEnvironment.gitDirty ? ' (dirty)' : ''}`,
		);

		if (comparisonMetadata.warnings.length > 0) {
			lines.push(
				'Compare Warnings:',
				...comparisonMetadata.warnings.map(warning => `- ${warning}`),
			);
		}
	}

	lines.push(
		'',
		'| Scenario | Suite | Iterations | Rounds | Median total (ms) | Median op (us) | Min-Max op (us) | RSD % | Delta |',
		'| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
	);

	for (const result of bundle.results) {
		lines.push(
			`| ${formatScenarioName(result)} | ${formatSuiteName(result)} | ${result.plan.iterations} | ${result.plan.rounds} | ${result.medianTotalMs} | ${result.medianOperationUs} | ${result.minOperationUs}-${result.maxOperationUs} | ${result.relativeStdDevPct} | ${formatDelta(comparisonById.get(result.id))} |`,
		);
	}

	const resultWarnings = bundle.results.flatMap(result => result.warnings.map(
		warning => `- ${result.id}: ${warning}`,
	));
	if (resultWarnings.length > 0) {
		lines.push(
			'',
			'Result Warnings:',
			...resultWarnings,
		);
	}

	return `${lines.join('\n')}\n`;
};
