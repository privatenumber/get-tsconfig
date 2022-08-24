import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { getTscResolution } from '../../utils';
import { createResolver } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('directories with package.json', ({ test, describe }) => {
		describe('main', () => {
			test('.ts -> .ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					directory: {
						'package.json': JSON.stringify({
							main: 'file.ts',
						}),
						'file.ts': '',
					},
				});

				const request = './directory';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/file.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.js -> .js', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					directory: {
						'package.json': JSON.stringify({
							main: 'main.js',
						}),
						'main.js': '',
					},
				});

				const request = './directory';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/main.js')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.js -> ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					directory: {
						'package.json': JSON.stringify({
							main: 'main.js',
						}),
						'main.ts': '',
					},
				});

				const request = './directory';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/main.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.js -> tsx', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					directory: {
						'package.json': JSON.stringify({
							main: 'main.js',
						}),
						'main.tsx': '',
					},
				});

				const request = './directory';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/main.tsx')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('nonexistent main fallback to index', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					directory: {
						'package.json': JSON.stringify({
							main: 'non-existent',
						}),
						'index.tsx': '',
					},
				});

				const request = './directory';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/index.tsx')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('relative path', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'index.ts': '',
					directory: {
						'package.json': JSON.stringify({
							main: '..',
						}),
					},
				});

				const request = './directory';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/index.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('package.json to be parsed as JSONC', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					directory: {
						'file.ts': '',
						'package.json': `{
							// comment here
							"main": "file.js", // dangling comma
						}`,
					},
				});

				const request = './directory';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/file.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});
		});

		test('export maps to not work', async () => {
			const fixture = await createFixture({
				'tsconfig.json': '',
				directory: {
					'file.ts': '',
					'package.json': JSON.stringify({
						name: 'package',
						exports: './file.ts',
					}),
				},
			});

			const request = './directory';
			const resolved = createResolver()(request, fixture.path);
			const tsResolved = await getTscResolution(request, fixture.path);

			expect(resolved).toBe(undefined);
			expect(resolved).toBe(tsResolved.resolved);

			await fixture.rm();
		});
	});
});
