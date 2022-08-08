import fs from 'fs';
import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { getTscResolution } from '../utils';
import { tsResolve } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('ts-resolve', ({ test, describe }) => {
		describe('error', ({ test }) => {
			test('non existent path', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
				});

				const request = path.join(fixture.path, 'non-existent-path');
				const resolved = tsResolve(request, fs);
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

				const request = path.join(fixture.path, 'some-file.ts');
				const resolved = tsResolve(request, fs);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved).toBeUndefined();
				expect(tsResolved.resolved).toBeUndefined();

				await fixture.rm();
			});
		});

		describe('resolves extensionless', ({ test }) => {
			test('resolve .ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.ts': '',
				});

				const request = path.join(fixture.path, 'some-file');
				const resolved = tsResolve(request, fs);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved).toBe(tsResolved.resolved!.filePath);

				await fixture.rm();
			});

			test('resolve .tsx', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file.tsx': '',
				});

				const request = path.join(fixture.path, 'some-file');
				const resolved = tsResolve(request, fs);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved).toBe(tsResolved.resolved!.filePath);

				await fixture.rm();
			});

			test('combination', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'some-file': '',
					'some-file.ts': '',
					'some-file.tsx': '',
				});

				const request = path.join(fixture.path, 'some-file');
				const resolved = tsResolve(request, fs);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved).toBe(tsResolved.resolved!.filePath);

				await fixture.rm();
			});
		});

		describe('resolves via .js & .jsx', ({ describe }) => {
			describe('append TS extensions', ({ test }) => {
				test('resolve .js -> .js.ts', async () => {
					const fixture = await createFixture({
						'tsconfig.json': '',
						'some-file.js.ts': '',
					});

					const request = path.join(fixture.path, 'some-file.js');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/some-file.js.ts')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

					await fixture.rm();
				});

				test('resolve .js -> .js.tsx', async () => {
					const fixture = await createFixture({
						'tsconfig.json': '',
						'some-file.js.tsx': '',
					});

					const request = path.join(fixture.path, 'some-file.js');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/some-file.js.tsx')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

					await fixture.rm();
				});
			});

			describe('resolves TS counter part', ({ test }) => {
				test('.js -> .ts', async () => {
					const fixture = await createFixture({
						'tsconfig.json': '',
						'some-file.ts': '',
					});

					const request = path.join(fixture.path, 'some-file.js');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/some-file.ts')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

					await fixture.rm();
				});

				test('.jsx -> .ts', async () => {
					const fixture = await createFixture({
						'tsconfig.json': '',
						'some-file.ts': '',
					});

					const request = path.join(fixture.path, 'some-file.jsx');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/some-file.ts')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

					await fixture.rm();
				});

				test('.js -> .tsx', async () => {
					const fixture = await createFixture({
						'tsconfig.json': '',
						'some-file.tsx': '',
					});

					const request = path.join(fixture.path, 'some-file.js');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/some-file.tsx')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

					await fixture.rm();
				});

				test('.jsx -> .tsx', async () => {
					const fixture = await createFixture({
						'tsconfig.json': '',
						'some-file.tsx': '',
					});

					const request = path.join(fixture.path, 'some-file.jsx');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/some-file.tsx')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

					await fixture.rm();
				});
			});

			describe('resolves as JS', ({ test }) => {
				test('.js', async () => {
					const fixture = await createFixture({
						'tsconfig.json': '',
						'some-file.js': '',
					});

					const request = path.join(fixture.path, 'some-file.js');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/some-file.js')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

					await fixture.rm();
				});

				test('.jsx', async () => {
					const fixture = await createFixture({
						'tsconfig.json': '',
						'some-file.jsx': '',
					});

					const request = path.join(fixture.path, 'some-file.jsx');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/some-file.jsx')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

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

					const request = path.join(fixture.path, 'some-file.js');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/some-file.js.ts')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

					await fixture.rm();
				});

				test('.ts over .js', async () => {
					const fixture = await createFixture({
						'tsconfig.json': '',
						'some-file.js': '',
						'some-file.ts': '',
					});

					const request = path.join(fixture.path, 'some-file.js');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/some-file.ts')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

					await fixture.rm();
				});

				test('.ts over .tsx', async () => {
					const fixture = await createFixture({
						'tsconfig.json': '',
						'some-file.ts': '',
						'some-file.tsx': '',
					});

					const request = path.join(fixture.path, 'some-file.js');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/some-file.ts')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

					await fixture.rm();
				});
			});
		});

		describe('resolves directories', ({ test }) => {
			test('directory -> directory/index.ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'directory/index.ts': '',
				});

				const request = path.join(fixture.path, 'directory');
				const resolved = tsResolve(request, fs);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/index.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved!.filePath);

				await fixture.rm();
			});

			test('directory -> directory/index.tsx', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'directory/index.tsx': '',
				});

				const request = path.join(fixture.path, 'directory');
				const resolved = tsResolve(request, fs);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/index.tsx')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved!.filePath);

				await fixture.rm();
			});

			test('directory -> directory/index.js', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'directory/index.js': '',
				});

				const request = path.join(fixture.path, 'directory');
				const resolved = tsResolve(request, fs);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/index.js')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved!.filePath);

				await fixture.rm();
			});

			test('directory -> directory/index.jsx', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'directory/index.jsx': '',
				});

				const request = path.join(fixture.path, 'directory');
				const resolved = tsResolve(request, fs);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/index.jsx')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved!.filePath);

				await fixture.rm();
			});
		});

		describe('packages (package.json)', ({ test, describe }) => {
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

					const request = path.join(fixture.path, 'directory');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/file.ts')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

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

					const request = path.join(fixture.path, 'directory');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/main.js')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

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

					const request = path.join(fixture.path, 'directory');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/main.ts')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

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

					const request = path.join(fixture.path, 'directory');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/main.tsx')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

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

					const request = path.join(fixture.path, 'directory');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/index.tsx')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

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

					const request = path.join(fixture.path, 'directory');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/index.ts')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

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

					const request = path.join(fixture.path, 'directory');
					const resolved = tsResolve(request, fs);
					const tsResolved = await getTscResolution(request, fixture.path);

					expect(resolved?.endsWith('/file.ts')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved!.filePath);

					await fixture.rm();
				});
			});

			// resolve export map
		});
	});
});
