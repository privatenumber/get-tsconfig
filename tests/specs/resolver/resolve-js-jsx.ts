import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { getTscResolution } from '../../utils';
import { createResolver } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('.js & .jsx', ({ describe }) => {
		describe('append TS extensions', ({ test }) => {
			test('resolve .js -> .js.ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.js.ts': '',
				});

				const request = './some-file.js';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/some-file.js.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('resolve .js -> .js.tsx', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.js.tsx': '',
				});

				const request = './some-file.js';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/some-file.js.tsx')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});
		});

		describe('resolves TS counter part', ({ test }) => {
			test('.js -> .ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.ts': '',
				});

				const request = './some-file.js';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/some-file.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.jsx -> .ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.ts': '',
				});

				const request = './some-file.jsx';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/some-file.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.js -> .tsx', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.tsx': '',
				});

				const request = './some-file.js';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/some-file.tsx')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.jsx -> .tsx', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.tsx': '',
				});

				const request = './some-file.jsx';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/some-file.tsx')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});
		});

		describe('resolves as JS', ({ test }) => {
			test('.js', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.js': '',
				});

				const request = './some-file.js';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/some-file.js')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.jsx', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.jsx': '',
				});

				const request = './some-file.jsx';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/some-file.jsx')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});
		});

		describe('combination', ({ test }) => {
			test('.js.ts over .ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.js.ts': '',
					'some-file.ts': '',
				});

				const request = './some-file.js';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/some-file.js.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.ts over .js', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.js': '',
					'some-file.ts': '',
				});

				const request = './some-file.js';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/some-file.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.ts over .tsx', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.ts': '',
					'some-file.tsx': '',
				});

				const request = './some-file.js';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/some-file.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});
		});
	});
});
