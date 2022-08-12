import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { getTscResolution } from '../../utils';
import { createResolver } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('resolves extensionless', ({ test }) => {
		test('resolve .ts', async () => {
			const fixture = await createFixture({
				'tsconfig.json': '',
				'some-file.ts': '',
			});

			const request = './some-file';
			const resolved = createResolver()(request, fixture.path);
			const tsResolved = await getTscResolution(request, fixture.path);

			expect(resolved).toBe(tsResolved.resolved);

			await fixture.rm();
		});

		test('resolve .tsx', async () => {
			const fixture = await createFixture({
				'tsconfig.json': '',
				'some-file.tsx': '',
			});

			const request = './some-file';
			const resolved = createResolver()(request, fixture.path);
			const tsResolved = await getTscResolution(request, fixture.path);

			expect(resolved).toBe(tsResolved.resolved);

			await fixture.rm();
		});

		test('combination', async () => {
			const fixture = await createFixture({
				'tsconfig.json': '',
				'some-file': '',
				'some-file.ts': '',
				'some-file.tsx': '',
			});

			const request = './some-file';
			const resolved = createResolver()(request, fixture.path);
			const tsResolved = await getTscResolution(request, fixture.path);

			expect(resolved).toBe(tsResolved.resolved);

			await fixture.rm();
		});
	});
});
