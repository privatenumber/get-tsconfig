import path from 'node:path';
import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import slash from 'slash';
import { getExtendsChain, resolveExtendsChain, readTsconfig } from '#get-tsconfig';

describe('getExtendsChain', () => {
	test('no extends', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				compilerOptions: { strict: true },
			}),
		});

		const chain = getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		expect(chain.length).toBe(1);
		expect(chain[0].config.compilerOptions?.strict).toBe(true);
		expect(chain[0].config.extends).toBeUndefined();
	});

	test('linear chain', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './base.json',
				compilerOptions: { jsx: 'react-jsx' },
			}),
			'base.json': JSON.stringify({
				compilerOptions: { strict: true },
			}),
		});

		const chain = getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		expect(chain.length).toBe(2);
		expect(chain[0].path).toBe(slash(path.join(fixture.path, 'tsconfig.json')));
		expect(chain[1].path).toBe(slash(path.join(fixture.path, 'base.json')));
		expect(chain[0].config.compilerOptions?.jsx).toBe('react-jsx');
		expect(chain[1].config.compilerOptions?.strict).toBe(true);
	});

	test('extends resolved to absolute paths', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './base.json',
			}),
			'base.json': JSON.stringify({}),
		});

		const chain = getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		expect(chain[0].config.extends).toBe(slash(path.join(fixture.path, 'base.json')));
	});

	test('array extends', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: ['./base.json', './strict.json'],
			}),
			'base.json': JSON.stringify({
				compilerOptions: { target: 'es2022' },
			}),
			'strict.json': JSON.stringify({
				compilerOptions: { strict: true },
			}),
		});

		const chain = getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		expect(chain.length).toBe(3);

		// Root first
		expect(chain[0].path).toBe(slash(path.join(fixture.path, 'tsconfig.json')));

		// extends preserved as array with absolute paths
		expect(Array.isArray(chain[0].config.extends)).toBe(true);
		const extendsArray = chain[0].config.extends as string[];
		expect(extendsArray[0]).toBe(slash(path.join(fixture.path, 'base.json')));
		expect(extendsArray[1]).toBe(slash(path.join(fixture.path, 'strict.json')));
	});

	test('deep chain with array extends', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: ['./base.json', './strict.json'],
			}),
			'base.json': JSON.stringify({
				extends: './deep.json',
				compilerOptions: { target: 'es2022' },
			}),
			'strict.json': JSON.stringify({
				compilerOptions: { strict: true },
			}),
			'deep.json': JSON.stringify({
				compilerOptions: { module: 'node16' },
			}),
		});

		const chain = getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		expect(chain.length).toBe(4);

		// Order: root, then reversed declaration order depth-first
		expect(chain[0].path).toBe(slash(path.join(fixture.path, 'tsconfig.json')));
		expect(chain[1].path).toBe(slash(path.join(fixture.path, 'strict.json')));
		expect(chain[2].path).toBe(slash(path.join(fixture.path, 'base.json')));
		expect(chain[3].path).toBe(slash(path.join(fixture.path, 'deep.json')));
	});

	test('circularity detection - self extend', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './tsconfig.json',
			}),
		});

		expect(() => {
			getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		}).toThrow('Circularity detected');
	});

	test('circularity detection - indirect', async () => {
		await using fixture = await createFixture({
			'a.json': JSON.stringify({ extends: './b.json' }),
			'b.json': JSON.stringify({ extends: './a.json' }),
		});

		expect(() => {
			getExtendsChain(path.join(fixture.path, 'a.json'));
		}).toThrow('Circularity detected');
	});

	test('diamond deduplication', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: ['./a.json', './b.json'],
			}),
			'a.json': JSON.stringify({
				extends: './shared.json',
				compilerOptions: { strict: true },
			}),
			'b.json': JSON.stringify({
				extends: './shared.json',
				compilerOptions: { jsx: 'react-jsx' },
			}),
			'shared.json': JSON.stringify({
				compilerOptions: { target: 'es2022' },
			}),
		});

		const chain = getExtendsChain(path.join(fixture.path, 'tsconfig.json'));

		// shared.json should appear only once
		const sharedEntries = chain.filter(entry => entry.path.endsWith('shared.json'));
		expect(sharedEntries.length).toBe(1);
	});

	test('missing extends target throws', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './nonexistent.json',
			}),
		});

		expect(() => {
			getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		}).toThrow('not found');
	});

	test('non-object JSON throws', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': '"just a string"',
		});

		expect(() => {
			getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		}).toThrow('Failed to parse');
	});

	test('three-level chain', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './mid.json',
				compilerOptions: { jsx: 'react-jsx' },
			}),
			'mid.json': JSON.stringify({
				extends: './base.json',
				compilerOptions: { strict: true },
			}),
			'base.json': JSON.stringify({
				compilerOptions: { target: 'es2022' },
			}),
		});

		const chain = getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		expect(chain.length).toBe(3);
		expect(chain[0].path).toBe(slash(path.join(fixture.path, 'tsconfig.json')));
		expect(chain[1].path).toBe(slash(path.join(fixture.path, 'mid.json')));
		expect(chain[2].path).toBe(slash(path.join(fixture.path, 'base.json')));
	});

	test('cache', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './base.json',
				compilerOptions: { jsx: 'react-jsx' },
			}),
			'base.json': JSON.stringify({
				compilerOptions: { strict: true },
			}),
		});

		const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
		const cache = new Map();
		const chain = getExtendsChain(tsconfigPath, {
			cache,
		});

		await fixture.rm('tsconfig.json');
		await fixture.rm('base.json');

		const cachedChain = getExtendsChain(tsconfigPath, {
			cache,
		});
		expect(cachedChain).toStrictEqual(chain);
	});
});

describe('resolveExtendsChain', () => {
	test('produces same result as readTsconfig', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './base.json',
				compilerOptions: { jsx: 'react-jsx' },
			}),
			'base.json': JSON.stringify({
				compilerOptions: {
					strict: true,
					target: 'es2022',
				},
			}),
		});

		const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
		const chain = getExtendsChain(tsconfigPath);
		const fromChain = resolveExtendsChain(chain);
		const fromRead = readTsconfig(tsconfigPath);

		expect(fromChain.path).toBe(fromRead.path);
		expect(fromChain.config).toStrictEqual(fromRead.config);
	});

	test('does not mutate input chain', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './base.json',
				compilerOptions: { jsx: 'react-jsx' },
			}),
			'base.json': JSON.stringify({
				compilerOptions: { strict: true },
			}),
		});

		const chain = getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		const originalRoot = JSON.stringify(chain[0].config);

		resolveExtendsChain(chain);

		expect(JSON.stringify(chain[0].config)).toBe(originalRoot);
	});

	test('merges correctly - child overrides parent', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './base.json',
				compilerOptions: { strict: false },
			}),
			'base.json': JSON.stringify({
				compilerOptions: {
					strict: true,
					target: 'es2022',
				},
			}),
		});

		const chain = getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		const result = resolveExtendsChain(chain);

		expect(result.config.compilerOptions?.strict).toBe(false);
		expect(result.config.compilerOptions?.target).toBe('es2022');
	});

	test('array extends - later entries take precedence', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: ['./a.json', './b.json'],
			}),
			'a.json': JSON.stringify({
				compilerOptions: {
					strict: true,
					target: 'es2020',
				},
			}),
			'b.json': JSON.stringify({
				compilerOptions: { target: 'es2022' },
			}),
		});

		const chain = getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		const result = resolveExtendsChain(chain);

		// b overrides a for target, a's strict is inherited
		expect(result.config.compilerOptions?.target).toBe('es2022');
		expect(result.config.compilerOptions?.strict).toBe(true);
	});

	test('empty chain throws', () => {
		expect(() => {
			resolveExtendsChain([]);
		}).toThrow('Chain must not be empty');
	});

	test('idempotent - calling twice produces same result', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './base.json',
				compilerOptions: { jsx: 'react-jsx' },
			}),
			'base.json': JSON.stringify({
				compilerOptions: { strict: true },
			}),
		});

		const chain = getExtendsChain(path.join(fixture.path, 'tsconfig.json'));
		const first = resolveExtendsChain(chain);
		const second = resolveExtendsChain(chain);

		expect(first.config).toStrictEqual(second.config);
	});

	test('shared ancestor with paths (no baseUrl) resolves correctly', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: ['./a.json', './b.json'],
			}),
			'a.json': JSON.stringify({
				extends: './shared/tsconfig.json',
				compilerOptions: { strict: true },
			}),
			'b.json': JSON.stringify({
				extends: './shared/tsconfig.json',
				compilerOptions: { jsx: 'react-jsx' },
			}),
			'shared/tsconfig.json': JSON.stringify({
				compilerOptions: {
					paths: { '@/*': ['./src/*'] },
				},
			}),
			'shared/src/index.ts': '',
		});

		const tsconfigPath = path.join(fixture.path, 'tsconfig.json');

		// Both branches extend shared config with paths but no baseUrl.
		// The implicitBaseUrlSymbol must survive memoization + structuredClone.
		const chain = getExtendsChain(tsconfigPath);
		const fromChain = resolveExtendsChain(chain);
		const fromRead = readTsconfig(tsconfigPath);

		expect(fromChain.config).toStrictEqual(fromRead.config);
	});

	test('diamond dependency merge result', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: ['./a.json', './b.json'],
				compilerOptions: { jsx: 'react-jsx' },
			}),
			'a.json': JSON.stringify({
				extends: './shared.json',
				compilerOptions: { strict: true },
			}),
			'b.json': JSON.stringify({
				extends: './shared.json',
				compilerOptions: { module: 'node16' },
			}),
			'shared.json': JSON.stringify({
				compilerOptions: { target: 'es2022' },
			}),
		});

		const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
		const chain = getExtendsChain(tsconfigPath);
		const result = resolveExtendsChain(chain);
		const fromRead = readTsconfig(tsconfigPath);

		// Verify merge result matches readTsconfig
		expect(result.config).toStrictEqual(fromRead.config);

		// shared's target inherited through both branches
		expect(result.config.compilerOptions?.target).toBe('es2022');
		// a's strict inherited
		expect(result.config.compilerOptions?.strict).toBe(true);
		// root's jsx wins
		expect(result.config.compilerOptions?.jsx).toBe('react-jsx');
	});

	test('sources contains all contributing tsconfig paths', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './base.json',
				compilerOptions: { jsx: 'react-jsx' },
			}),
			'base.json': JSON.stringify({
				compilerOptions: { strict: true },
			}),
		});

		const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
		const chain = getExtendsChain(tsconfigPath);
		const result = resolveExtendsChain(chain);

		expect(result.sources).toStrictEqual([
			slash(path.join(fixture.path, 'tsconfig.json')),
			slash(path.join(fixture.path, 'base.json')),
		]);
		expect(result.sources![0]).toBe(result.path);
	});

	test('sources with no extends contains only root', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				compilerOptions: { strict: true },
			}),
		});

		const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
		const chain = getExtendsChain(tsconfigPath);
		const result = resolveExtendsChain(chain);

		expect(result.sources).toStrictEqual([
			slash(path.join(fixture.path, 'tsconfig.json')),
		]);
	});

	test('sources via readTsconfig', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './base.json',
				compilerOptions: { jsx: 'react-jsx' },
			}),
			'base.json': JSON.stringify({
				extends: './deep.json',
				compilerOptions: { strict: true },
			}),
			'deep.json': JSON.stringify({
				compilerOptions: { target: 'es2022' },
			}),
		});

		const result = readTsconfig(path.join(fixture.path, 'tsconfig.json'));
		expect(result.sources).toStrictEqual([
			slash(path.join(fixture.path, 'tsconfig.json')),
			slash(path.join(fixture.path, 'base.json')),
			slash(path.join(fixture.path, 'deep.json')),
		]);
	});

	test('equivalence with complex config', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './base.json',
				compilerOptions: {
					outDir: './dist',
					baseUrl: '.',
					paths: { '@/*': ['./src/*'] },
				},
				include: ['src/**/*.ts'],
				exclude: ['node_modules'],
			}),
			'base.json': JSON.stringify({
				compilerOptions: {
					target: 'es2022',
					module: 'node16',
					strict: true,
					declaration: true,
					declarationDir: './types',
				},
				include: ['**/*.ts'],
			}),
		});

		const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
		const chain = getExtendsChain(tsconfigPath);
		const fromChain = resolveExtendsChain(chain);
		const fromRead = readTsconfig(tsconfigPath);

		expect(fromChain.path).toBe(fromRead.path);
		expect(fromChain.config).toStrictEqual(fromRead.config);
	});

	test('three-level chain merge', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': JSON.stringify({
				extends: './mid.json',
				compilerOptions: { jsx: 'react-jsx' },
			}),
			'mid.json': JSON.stringify({
				extends: './base.json',
				compilerOptions: { strict: true },
			}),
			'base.json': JSON.stringify({
				compilerOptions: {
					target: 'es2022',
					strict: false,
				},
			}),
		});

		const tsconfigPath = path.join(fixture.path, 'tsconfig.json');
		const chain = getExtendsChain(tsconfigPath);
		const result = resolveExtendsChain(chain);
		const fromRead = readTsconfig(tsconfigPath);

		expect(result.config).toStrictEqual(fromRead.config);
		// mid overrides base's strict: false → true
		expect(result.config.compilerOptions?.strict).toBe(true);
		// base's target inherited
		expect(result.config.compilerOptions?.target).toBe('es2022');
		// root's jsx added
		expect(result.config.compilerOptions?.jsx).toBe('react-jsx');
	});
});
