import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { getTscResolution } from '../../utils';
import { createResolver } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('.mjs & .cjs', ({ describe }) => {
		describe('append TS extensions', ({ test }) => {
			test('resolve .mjs -> .mjs.ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.mjs.ts': '',
				});
	
				const request = './some-file.mjs';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);
	
				expect(resolved?.endsWith('/some-file.mjs.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);
	
				await fixture.rm();
			});
	
			test('resolve .cjs -> .cjs.tsx', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.cjs.tsx': '',
				});
	
				const request = './some-file.cjs';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);
	
				expect(resolved?.endsWith('/some-file.cjs.tsx')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);
	
				await fixture.rm();
			});
		});
	
		describe('resolves TS counter part', ({ test }) => {
			test('.mjs -> .mts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.mts': '',
				});
	
				const request = './some-file.mjs';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);
	
				expect(resolved?.endsWith('/some-file.mts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);
	
				await fixture.rm();
			});
	
			test('.cjs -> .cts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.cts': '',
				});
	
				const request = './some-file.cjs';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);
	
				expect(resolved?.endsWith('/some-file.cts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);
	
				await fixture.rm();
			});
		});
	
		describe('resolves as JS', ({ test }) => {
			test('.mjs', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.mjs': '',
				});
	
				const request = './some-file.mjs';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);
	
				expect(resolved?.endsWith('/some-file.mjs')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);
	
				await fixture.rm();
			});
	
			test('.cjs', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.cjs': '',
				});
	
				const request = './some-file.cjs';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);
	
				expect(resolved?.endsWith('/some-file.cjs')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);
	
				await fixture.rm();
			});
		});
	
		describe('combination', ({ test }) => {
			test('.mts over .mjs', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.mjs': '',
					'some-file.mts': '',
				});
	
				const request = './some-file.mjs';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);
	
				expect(resolved?.endsWith('/some-file.mts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);
	
				await fixture.rm();
			});
	
			test('.mjs.jsx over .mjs', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.mjs.jsx': '',
					'some-file.mjs': '',
				});
	
				const request = './some-file.mjs';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);
	
				expect(resolved?.endsWith('/some-file.mjs.jsx')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);
	
				await fixture.rm();
			});
		});
	});
});
