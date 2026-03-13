import { cleanup } from './utils.ts';
import { run as runRepeatedCalls } from './repeated-calls.ts';
import { run as runMonorepo } from './monorepo.ts';
import { run as runExtendsChain } from './extends-chain.ts';

console.log('Running benchmarks...\n');

const results = [
	...runRepeatedCalls(),
	...runMonorepo(),
	...runExtendsChain(),
];

console.log('Results:\n');
console.log('| Scenario | Iterations | Total (ms) | Per iteration (us) |');
console.log('| --- | ---: | ---: | ---: |');
for (const result of results) {
	const note = result.note ? ` (${result.note})` : '';
	console.log(`| ${result.name}${note} | ${result.iterations} | ${result.totalMs} | ${result.perIterationUs} |`);
}

console.log('\nRaw JSON:\n');
console.log(JSON.stringify(results, null, 2));

cleanup();
