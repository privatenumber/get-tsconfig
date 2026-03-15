import { parseArgs } from 'node:util';
import { scenarios, repoRoot } from './scenarios.ts';
import { runScenario } from './runner.ts';

const scenariosById = new Map(
	scenarios.map(scenario => [scenario.id, scenario]),
);

const cliArgs = process.argv.slice(2).filter(argument => argument !== '--');

const {
	values: {
		scenario: scenarioId,
	},
} = parseArgs({
	args: cliArgs,
	options: {
		scenario: {
			type: 'string',
		},
	},
	strict: true,
});

if (!scenarioId) {
	throw new Error('Missing required --scenario argument.');
}

const scenario = scenariosById.get(scenarioId);

if (!scenario) {
	throw new Error(`Unknown benchmark scenario: ${scenarioId}`);
}

process.stdout.write(`${JSON.stringify(runScenario(scenario, repoRoot))}\n`);
