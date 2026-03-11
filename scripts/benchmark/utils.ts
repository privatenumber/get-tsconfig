import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';

export const temporaryBase = path.join(os.tmpdir(), `get-tsconfig-bench-${Date.now()}`);
fs.mkdirSync(temporaryBase, { recursive: true });

export const writeJson = (filePath: string, data: unknown) => {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, JSON.stringify(data));
};

export type BenchmarkResult = {
	name: string;
	iterations: number;
	totalMs: number;
	perIterationUs: number;
	note?: string;
};

export const measure = (
	name: string,
	iterations: number,
	function_: () => void,
): BenchmarkResult => {
	// Warmup
	function_();

	const start = performance.now();
	for (let i = 0; i < iterations; i += 1) {
		function_();
	}
	const totalMs = performance.now() - start;

	return {
		name,
		iterations,
		totalMs: Math.round(totalMs * 1000) / 1000,
		perIterationUs: Math.round((totalMs / iterations) * 1000 * 1000) / 1000,
	};
};

export const cleanup = () => {
	fs.rmSync(temporaryBase, {
		recursive: true,
		force: true,
	});
};
