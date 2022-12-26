import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { getTscResolution } from '../../utils';
import { createResolver } from '#get-tsconfig';

export default testSuite(({ describe }) => {
	describe('dependencies', ({ test, describe }) => {
		describe('finds package', ({ test }) => {
			test('index.js', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/some-dependency': {
						'package.json': JSON.stringify({
							name: 'some-dependency',
						}),
						'index.js': '',
					},
				});

				const request = 'some-dependency';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/index.js')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('@org', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/@org.js': '',
				});

				const request = '@org';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/@org.js')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('@org/package', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/@org/package.js': '',
				});

				const request = '@org/package';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				// console.log({ resolved, tsResolved });

				expect(resolved?.endsWith('/@org/package.js')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('no package.json', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/some-dependency': {
						'index.js': '',
					},
				});

				const request = 'some-dependency';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/index.js')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('no directory', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/some-dependency.js': '',
				});

				const request = 'some-dependency';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/some-dependency.js')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('nested', async () => {
				const fixture = await createFixture({
					'a/b/c/d': {
						'tsconfig.json': '',
					},
					'node_modules/some-dependency': {
						'index.tsx': '',
					},
				});

				const request = 'some-dependency';
				const projectPath = path.join(fixture.path, 'a/b/c/d');
				const resolved = createResolver()(request, projectPath);
				const tsResolved = await getTscResolution(request, projectPath);

				expect(resolved?.endsWith('/some-dependency/index.tsx')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});
		});

		describe('main', ({ test }) => {
			test('.ts -> .ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/dep': {
						'package.json': JSON.stringify({
							main: 'file.ts',
						}),
						'file.ts': '',
					},
				});

				const request = 'dep';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/file.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.js -> .js', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/dep': {
						'package.json': JSON.stringify({
							main: 'file.js',
						}),
						'file.js': '',
					},
				});

				const request = 'dep';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/file.js')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.js -> ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/dep': {
						'package.json': JSON.stringify({
							main: 'file.js',
						}),
						'file.ts': '',
					},
				});

				const request = 'dep';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/file.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.js -> tsx', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/dep': {
						'package.json': JSON.stringify({
							main: 'file.js',
						}),
						'file.tsx': '',
					},
				});

				const request = 'dep';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/file.tsx')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('nonexistent main fallback to index', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/dep': {
						'package.json': JSON.stringify({
							main: 'non-existent',
						}),
						'index.js': '',
					},
				});

				const request = 'dep';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/index.js')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('relative path', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'index.ts': '',
					'node_modules/dep': {
						'package.json': JSON.stringify({
							main: '../..',
						}),
					},
				});

				const request = 'dep';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/index.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('@scoped: .js -> ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/@org/dep': {
						'package.json': JSON.stringify({
							main: 'file.js',
						}),
						'file.ts': '',
					},
				});

				const request = '@org/dep';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/file.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});
		});

		describe('subpaths', ({ describe, test }) => {
			test('no package.json', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/dep': {
						'file.ts': '',
					},
				});

				const request = 'dep/file';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/file.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('package.json', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/dep': {
						'package.json': JSON.stringify({}),
						'file.js': '',
					},
				});

				const request = 'dep/file.js';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/file.js')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.js -> .ts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/dep': {
						'package.json': JSON.stringify({}),
						'file.ts': '',
					},
				});

				const request = 'dep/file.js';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/file.ts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			test('.mjs -> .mts', async () => {
				const fixture = await createFixture({
					'tsconfig.json': '',
					'node_modules/dep': {
						'package.json': JSON.stringify({}),
						'file.mts': '',
					},
				});

				const request = 'dep/file.mjs';
				const resolved = createResolver()(request, fixture.path);
				const tsResolved = await getTscResolution(request, fixture.path);

				expect(resolved?.endsWith('/file.mts')).toBeTruthy();
				expect(resolved).toBe(tsResolved.resolved);

				await fixture.rm();
			});

			describe('export map', ({ test }) => {
				test('main', async () => {
					const fixture = await createFixture({
						'tsconfig.json': JSON.stringify({
							compilerOptions: {
								moduleResolution: 'Node16',
							},
						}),
						'node_modules/dep': {
							'package.json': JSON.stringify({
								exports: './file.js',
							}),
							'file.js': '',
						},
					});
	
					const request = 'dep';
					const resolved = createResolver()(request, fixture.path);
					const tsResolved = await getTscResolution(request, fixture.path);
	
					expect(resolved?.endsWith('/file.js')).toBeTruthy();
					expect(resolved).toBe(tsResolved.resolved);
	
					await fixture.rm();
				});

				test('main - should not work without ./', async () => {
					const fixture = await createFixture({
						'tsconfig.json': JSON.stringify({
							compilerOptions: {
								moduleResolution: 'Node16',
							},
						}),
						'node_modules/dep': {
							'package.json': JSON.stringify({
								// Should be prefixed by ./
								exports: 'file.js',
							}),
							'file.js': '',
						},
					});

					expect(() => createResolver()('dep', fixture.path)).toThrow(
						'Invalid "exports" target "file.js" defined in the package config',
					);
	
					await fixture.rm();
				});

				test('export map', async () => {
					const fixture = await createFixture({
						'tsconfig.json': JSON.stringify({
							compilerOptions: {
								moduleResolution: 'Node16',
							},
						}),
						'node_modules/dep': {
							'package.json': JSON.stringify({
								exports: {
									'.': './entry.js',
									'./a': './file-a.js',
									'./b': './file-b.js',
								},
							}),
							'entry.js': '',
							'file-a.js': '',
							'file-b.js': '',
						},
					});

					const map = {
						dep: '/entry.js',
						'dep/a': '/file-a.js',
						'dep/b': '/file-b.js',
					};

					for (const request in map) {
						const resolved = createResolver()(request, fixture.path);
						const tsResolved = await getTscResolution(request, fixture.path);
						expect(resolved?.endsWith(map[request as keyof typeof map])).toBeTruthy();
						expect(resolved).toBe(tsResolved.resolved);
					}
	
					await fixture.rm();
				});

				test('export map with *', async () => {
					const fixture = await createFixture({
						'tsconfig.json': JSON.stringify({
							compilerOptions: {
								moduleResolution: 'Node16',
							},
						}),
						'node_modules/dep': {
							'package.json': JSON.stringify({
								exports: {
									'./file/*': './lib/*.js',
								},
							}),
							lib: {
								'a.js': '',
								'b.js': '',
							},
						},
					});

					const map = {
						'dep/file/a': '/lib/a.js',
						'dep/file/b': '/lib/b.js',
					};

					for (const request in map) {
						const resolved = createResolver()(request, fixture.path);
						const tsResolved = await getTscResolution(request, fixture.path);
						expect(resolved?.endsWith(map[request as keyof typeof map])).toBeTruthy();
						expect(resolved).toBe(tsResolved.resolved);
					}
	
					await fixture.rm();
				});

				test('export map block', async () => {
					const fixture = await createFixture({
						'tsconfig.json': JSON.stringify({
							compilerOptions: {
								moduleResolution: 'Node16',
							},
						}),
						'node_modules/dep': {
							'package.json': JSON.stringify({
								exports: {},
							}),
							'a.js': '',
							'b.js': '',
						},
					});

					const files = ['dep/a', 'dep/b'];

					for (const file of files) {
						const resolved = createResolver()(file, fixture.path);
						const tsResolved = await getTscResolution(file, fixture.path);
						expect(resolved).toBeUndefined();
						expect(resolved).toBe(tsResolved.resolved);
					}

					await fixture.rm();
				});
			});

			test('self import', async () => {
				const fixture = await createFixture({
					'tsconfig.json': JSON.stringify({
						compilerOptions: {
							moduleResolution: 'Node16',
						},
					}),
					'node_modules/dep': {
						'package.json': JSON.stringify({
							name: 'dep',
							exports: './entry.js',
						}),
						'entry.js': '',
						'node_modules/dep': {
							'package.json': JSON.stringify({
								name: 'dep',
								exports: {
									'.': './entry.js',
									'./file': './file.js',
								},
							}),
							'entry.js': '',
						},
					},
				});

				const resolved = createResolver()('dep', path.join(fixture.path, 'node_modules/dep/'));
				expect(resolved?.endsWith('/node_modules/dep/node_modules/dep/entry.js')).toBeTruthy();

				await fixture.rm();
			});
		});
	});
});
