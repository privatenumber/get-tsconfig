import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfigJson } from '../../../../utils.js';
import { parseTsconfig } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('resolves', ({ test, runTestSuite }) => {
		test('handles missing extends', async () => {
			const fixture = await createFixture({
				'file.ts': '',
				'tsconfig.json': createTsconfigJson({
					extends: 'missing-package',
				}),
			});

			expect(
				() => parseTsconfig(path.join(fixture.path, 'tsconfig.json')),
			).toThrow('File \'missing-package\' not found.');

			await fixture.rm();
		});

		runTestSuite(import('./relative-path.spec.js'));
		runTestSuite(import('./absolute-path.spec.js'));
		runTestSuite(import('./node-modules.spec.js'));
	});
});
