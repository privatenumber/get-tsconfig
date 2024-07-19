import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfigJson, getTscResolution } from './utils.js';
import { getTsconfig, createPathsMatcher } from '#get-tsconfig';

await describe('get-tsconfig', ({ runTestSuite }) => {
	runTestSuite(import('./specs/get-tsconfig.js'));
	runTestSuite(import('./specs/parse-tsconfig/index.js'));
	runTestSuite(import('./specs/create-paths-matcher.js'));
	runTestSuite(import('./specs/create-files-matcher.js'));
});

/**
 * This needs to happen in isolation because it changes process.cwd
 *
 * TODO: either: 1) update code to not rely on cwd, or 2) update manten to handle parallel: false
 */
test('paths > baseUrl > relative path', async () => {
	await using fixture = await createFixture({
		'dir/tsconfig.json': createTsconfigJson({
			compilerOptions: {
				paths: {
					'@/*': ['./*'],
				},
			},
		}),
	});

	const cwd = process.cwd();

	try {
		process.chdir(fixture.path);

		const tsconfig = getTsconfig('./dir/tsconfig.json');
		expect(tsconfig).not.toBeNull();

		const matcher = createPathsMatcher(tsconfig!)!;
		expect(matcher).not.toBeNull();

		const resolvedAttempts = await getTscResolution('@/file', fixture.getPath('./dir'));
		expect(matcher('@/file')).toStrictEqual([
			resolvedAttempts[0].filePath.slice(0, -3),
		]);
	} finally {
		process.chdir(cwd);
	}
});
