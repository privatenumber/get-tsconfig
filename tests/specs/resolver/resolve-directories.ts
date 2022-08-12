import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { getTscResolution } from '../../utils';
import { createResolver } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('resolves directories', ({ test }) => {
		test('directory -> directory/index.ts', async () => {
			const fixture = await createFixture({
				'tsconfig.json': '',
				'directory/index.ts': '',
			});
	
			const request = './directory';
			const resolved = createResolver()(request, fixture.path);
			const tsResolved = await getTscResolution(request, fixture.path);
	
			expect(resolved?.endsWith('/index.ts')).toBeTruthy();
			expect(resolved).toBe(tsResolved.resolved);
	
			await fixture.rm();
		});
	
		test('directory -> directory/index.tsx', async () => {
			const fixture = await createFixture({
				'tsconfig.json': '',
				'directory/index.tsx': '',
			});
	
			const request = './directory';
			const resolved = createResolver()(request, fixture.path);
			const tsResolved = await getTscResolution(request, fixture.path);
	
			expect(resolved?.endsWith('/index.tsx')).toBeTruthy();
			expect(resolved).toBe(tsResolved.resolved);
	
			await fixture.rm();
		});
	
		test('directory -> directory/index.js', async () => {
			const fixture = await createFixture({
				'tsconfig.json': '',
				'directory/index.js': '',
			});
	
			const request = './directory';
			const resolved = createResolver()(request, fixture.path);
			const tsResolved = await getTscResolution(request, fixture.path);
	
			expect(resolved?.endsWith('/index.js')).toBeTruthy();
			expect(resolved).toBe(tsResolved.resolved);
	
			await fixture.rm();
		});
	
		test('directory -> directory/index.jsx', async () => {
			const fixture = await createFixture({
				'tsconfig.json': '',
				'directory/index.jsx': '',
			});
	
			const request = './directory';
			const resolved = createResolver()(request, fixture.path);
			const tsResolved = await getTscResolution(request, fixture.path);
	
			expect(resolved?.endsWith('/index.jsx')).toBeTruthy();
			expect(resolved).toBe(tsResolved.resolved);
	
			await fixture.rm();
		});
	});
});
