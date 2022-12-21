import path from 'path';
import fs from 'fs/promises';
import { createFixture } from 'fs-fixture';
import { execa } from 'execa';

const tscPath = path.resolve('node_modules/.bin/tsc');

const randomId = () => Math.random().toString(36).slice(2);

async function tscResolve(
	request: string,
	fixturePath: string,
) {
	const filePath = path.join(fixturePath, `${randomId()}.ts`);
	await fs.writeFile(
		filePath,
		`import '${request}'`,
	);
	const { stdout } = await execa(
		tscPath,
		[
			'--traceResolution',
			'--noEmit',
		],
		{ cwd: fixturePath },
	);

	await fs.rm(filePath, {
		force: true,
	});

	return stdout;
}

(async () => {
	const fixture = await createFixture({
		'tsconfig.json': JSON.stringify({
			compilerOptions: {
				moduleResolution: 'Node16',
			},
		}),
		node_modules: {
			'dep': {
				'package.json': JSON.stringify({
					exports: ['./missing.ts', './asdf.ts'],
				}),
				'asdf.ts': '',
			},
		},
	});

	const stdout = await tscResolve('dep', fixture.path);

	console.log(stdout);

	await fixture.rm();
})();
