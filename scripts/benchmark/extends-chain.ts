import path from 'node:path';
import fs from 'node:fs';
import { getExtendsChain, resolveExtendsChain } from '#get-tsconfig';
import {
	temporaryBase, writeJson, measure, type BenchmarkResult,
} from './utils.ts';

const setupLinearChain = (depth: number) => {
	const directory = path.join(temporaryBase, 'linear');
	fs.mkdirSync(directory, { recursive: true });

	for (let i = depth; i >= 0; i -= 1) {
		const config: Record<string, unknown> = {
			compilerOptions: { [`opt${i}`]: true },
		};
		if (i < depth) {
			config.extends = `./${i + 1}.json`;
		}
		writeJson(path.join(directory, `${i}.json`), config);
	}

	return path.join(directory, '0.json');
};

const setupDiamondGraph = (branchCount: number) => {
	const directory = path.join(temporaryBase, 'diamond');
	fs.mkdirSync(directory, { recursive: true });

	// Shared base
	writeJson(path.join(directory, 'base.json'), {
		compilerOptions: { strict: true },
	});

	// Branches all extending base
	const branches = Array.from({ length: branchCount }, (_, i) => {
		const name = `branch-${i}.json`;
		writeJson(path.join(directory, name), {
			extends: './base.json',
			compilerOptions: { [`branch${i}`]: true },
		});
		return `./${name}`;
	});

	// Root extends all branches
	writeJson(path.join(directory, 'root.json'), {
		extends: branches,
		compilerOptions: { root: true },
	});

	return path.join(directory, 'root.json');
};

export const run = (): BenchmarkResult[] => {
	const linearPath = setupLinearChain(200);
	const diamondPath = setupDiamondGraph(200);

	const linearChain = getExtendsChain(linearPath);
	const diamondChain = getExtendsChain(diamondPath);

	const linear = measure(`resolveExtendsChain (linear, ${linearChain.length} nodes)`, 300, () => {
		resolveExtendsChain(linearChain);
	});

	const diamond = measure(`resolveExtendsChain (diamond, ${diamondChain.length} nodes)`, 300, () => {
		resolveExtendsChain(diamondChain);
	});

	return [linear, diamond];
};
