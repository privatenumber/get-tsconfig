import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { formatBundle } from './format.ts';
import { scenarios, repoRoot } from './scenarios.ts';
import {
	compareBundles,
	createBenchmarkBundle,
	validateComparison,
} from './runner.ts';
import type {
	BenchmarkBundle,
	BenchmarkComparisonMetadata,
	BenchmarkKind,
	BenchmarkResult,
	RegisteredBenchmarkScenario,
} from './types.ts';

const benchmarkDirectory = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(benchmarkDirectory, 'worker.ts');
const cliArgs = process.argv.slice(2).filter(argument => argument !== '--');
const workerTimeoutMs = 120_000;

const {
	values: {
		json: jsonOutput = false,
		list = false,
		help = false,
		save,
		compare,
		filter = [],
		suite = [],
		scenario = [],
		kind = [],
	},
} = parseArgs({
	args: cliArgs,
	options: {
		json: {
			type: 'boolean',
		},
		list: {
			type: 'boolean',
		},
		help: {
			type: 'boolean',
			short: 'h',
		},
		save: {
			type: 'string',
		},
		compare: {
			type: 'string',
		},
		filter: {
			type: 'string',
			multiple: true,
			short: 'f',
		},
		suite: {
			type: 'string',
			multiple: true,
		},
		scenario: {
			type: 'string',
			multiple: true,
		},
		kind: {
			type: 'string',
			multiple: true,
		},
	},
	strict: true,
});

const selectedKinds = kind as BenchmarkKind[];

const usage = [
	'Usage: pnpm benchmark -- [options]',
	'',
	'Options:',
	'  --list                 List matching scenarios and exit',
	'  --json                 Output machine-readable JSON',
	'  --save <file>          Save the benchmark bundle JSON to a file',
	'  --compare <file>       Compare against a saved benchmark bundle',
	'  --filter, -f <text>    Match scenario id, name, or suite by substring',
	'  --suite <name>         Restrict to one or more suite substrings',
	'  --scenario <id>        Restrict to one or more scenario id substrings',
	'  --kind <macro|micro>   Restrict to benchmark kind',
	'  --help, -h             Show this help text',
	'',
	'Examples:',
	'  pnpm benchmark',
	'  pnpm benchmark -- --suite repeated-calls --kind micro',
	'  pnpm benchmark -- --filter package-extends --json',
	'  pnpm benchmark -- --suite search-paths --save /tmp/search.json',
	'  pnpm benchmark -- --suite search-paths --compare /tmp/search.json',
].join('\n');

if (help) {
	process.stdout.write(`${usage}\n`);
	process.exitCode = 0;
} else {
	const matchesPatterns = (
		value: string,
		patterns: string[],
	) => (
		patterns.length === 0
		|| patterns.some(pattern => value.includes(pattern))
	);

	const matchesScenario = (
		benchmarkScenario: RegisteredBenchmarkScenario,
	) => (
		matchesPatterns(benchmarkScenario.suite, suite)
		&& matchesPatterns(benchmarkScenario.id, scenario)
		&& (
			selectedKinds.length === 0
			|| selectedKinds.includes(benchmarkScenario.kind)
		)
		&& (
			filter.length === 0
			|| filter.some(pattern => (
				benchmarkScenario.id.includes(pattern)
				|| benchmarkScenario.name.includes(pattern)
				|| benchmarkScenario.suite.includes(pattern)
			))
		)
	);

	const selectedScenarios = scenarios.filter(matchesScenario);

	if (selectedScenarios.length === 0) {
		throw new Error('No benchmark scenarios matched the provided filters.');
	}

	if (list) {
		for (const benchmarkScenario of selectedScenarios) {
			process.stdout.write(`- ${benchmarkScenario.id} [${benchmarkScenario.suite}/${benchmarkScenario.kind}] ${benchmarkScenario.note ? `${benchmarkScenario.name} (${benchmarkScenario.note})` : benchmarkScenario.name}\n`);
		}
		process.exitCode = 0;
	} else {
		const runScenarioInWorker = (
			benchmarkScenario: RegisteredBenchmarkScenario,
		): BenchmarkResult => {
			try {
				const stdout = execFileSync(
					process.execPath,
					[
						workerPath,
						'--scenario',
						benchmarkScenario.id,
					],
					{
						cwd: repoRoot,
						env: process.env,
						encoding: 'utf8',
						stdio: ['ignore', 'pipe', 'pipe'],
						timeout: workerTimeoutMs,
					},
				);

				return JSON.parse(stdout) as BenchmarkResult;
			} catch (error) {
				const failure = error as {
					message: string;
					stderr?: string | Buffer;
				};
				const stderr = typeof failure.stderr === 'string'
					? failure.stderr.trim()
					: failure.stderr?.toString().trim();
				const timeoutMessage = failure.message.includes('ETIMEDOUT')
					? `Scenario exceeded timeout of ${workerTimeoutMs}ms.`
					: undefined;

				throw new Error(
					[
						`Benchmark scenario failed: ${benchmarkScenario.id}`,
						timeoutMessage,
						stderr || failure.message,
					].filter(Boolean).join('\n\n'),
				);
			}
		};

		if (!jsonOutput) {
			process.stdout.write(`Running scenarios: ${selectedScenarios.map(benchmarkScenario => benchmarkScenario.id).join(', ')}\n\n`);
		}

		const results = selectedScenarios.map(runScenarioInWorker);
		const bundle = createBenchmarkBundle(
			{
				filter,
				suites: suite,
				scenarios: scenario,
				kinds: selectedKinds,
			},
			repoRoot,
			results,
		);

		const baselineBundle = compare
			? JSON.parse(
				fs.readFileSync(path.resolve(process.cwd(), compare), 'utf8'),
			) as BenchmarkBundle
			: undefined;
		const comparisonValidation = baselineBundle
			? validateComparison(bundle, baselineBundle)
			: undefined;
		if (comparisonValidation?.errors.length) {
			throw new Error(
				[
					'Benchmark comparison is not valid:',
					...comparisonValidation.errors.map(error => `- ${error}`),
				].join('\n'),
			);
		}
		const comparisons = baselineBundle
			? compareBundles(bundle, baselineBundle)
			: undefined;
		const comparisonMetadata: BenchmarkComparisonMetadata | undefined = baselineBundle
			? {
				baselineGeneratedAt: baselineBundle.generatedAt,
				baselineEnvironment: baselineBundle.environment,
				warnings: comparisonValidation?.warnings ?? [],
			}
			: undefined;

		if (save) {
			const outputPath = path.resolve(process.cwd(), save);
			fs.mkdirSync(path.dirname(outputPath), { recursive: true });
			fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2));
		}

		if (jsonOutput) {
			process.stdout.write(`${JSON.stringify(
				comparisons
					? {
						...bundle,
						comparisons,
						comparisonMetadata,
					}
					: bundle,
				null,
				2,
			)}\n`);
		} else {
			process.stdout.write(formatBundle(bundle, comparisons, comparisonMetadata));
		}
	}
}
