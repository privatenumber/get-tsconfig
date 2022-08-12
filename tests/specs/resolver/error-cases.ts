import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { getTscResolution } from '../../utils';
import { createResolver } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('error', ({ test }) => {
		test('non existent path', async () => {
			const fixture = await createFixture({
				'tsconfig.json': '',
			});

			const request = './non-existent-path';
			const resolved = createResolver()(request, fixture.path);
			const tsResolved = await getTscResolution(request, fixture.path);

			expect(resolved).toBeUndefined();
			expect(tsResolved.resolved).toBeUndefined();

			await fixture.rm();
		});

		test('explicit .ts', async () => {
			const fixture = await createFixture({
				'tsconfig.json': '',
				'some-file.ts': '',
			});

			const request = './some-file.ts';
			const resolved = createResolver()(request, fixture.path);
			const tsResolved = await getTscResolution(request, fixture.path);

			expect(resolved).toBeUndefined();
			expect(tsResolved.resolved).toBeUndefined();

			await fixture.rm();
		});
	});
});
