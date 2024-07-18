import path from 'path';
import { createFixture } from 'fs-fixture';
import { expect, testSuite } from 'manten';
import { createTsconfigJson } from '../utils.js';
import { createPathsMatcher, getTsconfig } from '#get-tsconfig';

export default testSuite(({ test }) => {
	test('#79 implicit relative base url', async () => {
		await using fixture = await createFixture({
			'some-dir/src/file.ts': '',
			'some-dir/tsconfig.json': createTsconfigJson({
				compilerOptions: {
					paths: {
						'@/*': ['./src/*'],
					},
				},
			}),
		});

		const originalCwd = process.cwd();

		try {
			process.chdir(fixture.path);

			const tsconfig = getTsconfig('./some-dir');
			expect(tsconfig).not.toBeNull();

			const matcher = createPathsMatcher(tsconfig!)!;
			expect(matcher).not.toBeNull();

			expect(matcher('@/file.ts').at(0)).toBe(path.join(fixture.path, 'some-dir/src/file.ts'));
		} finally {
			process.chdir(originalCwd);
		}
	});
});
