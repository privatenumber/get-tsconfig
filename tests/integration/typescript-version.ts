import Module from 'node:module';
import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { readTsconfig } from '#get-tsconfig';
import { createTsconfigJson, createPackageJson } from '../utils/fixture-helpers.ts';

describe('typescriptVersion option', () => {
	test('omitted: defaults to \'auto\' (no defaults when TS not detected)', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({}),
		});

		// Detection walks up from fixture path → tmpdir parents → never finds
		// node_modules/typescript → no defaults applied.
		const result = readTsconfig(fixture.getPath('tsconfig.json'));
		expect(result.config.compilerOptions).toStrictEqual({});
	});

	test('omitted with TS installed: defaults are applied automatically', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({}),
			'node_modules/typescript/package.json': createPackageJson({
				name: 'typescript',
				version: '6.0.0',
			}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'));
		expect(result.config.compilerOptions?.moduleResolution).toBe('bundler');
	});

	test('false: opts out even when TS is installed', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({}),
			'node_modules/typescript/package.json': createPackageJson({
				name: 'typescript',
				version: '6.0.0',
			}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: false,
		});
		expect(result.config.compilerOptions).toStrictEqual({});
	});

	test('false: derivations still run when user explicitly sets options', async () => {
		// `false` only disables *unconditional* version-aware defaults.
		// Within-config derivations (e.g. `strict: true` ⇒ strict-family flags)
		// still flow through normalizeCompilerOptions because they describe
		// relationships within the user's own settings.
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({
				compilerOptions: { strict: true },
			}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: false,
		});
		expect(result.config.compilerOptions).toMatchObject({
			strict: true,
			noImplicitAny: true,
			strictNullChecks: true,
		});
	});

	test('explicit 4.x: defaults target to es3', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: '4.9.5',
		});
		expect(result.config.compilerOptions?.target).toBe('es3');
	});

	test('explicit 5.x: defaults target to es5 (overrides v4)', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: '5.9.2',
		});
		expect(result.config.compilerOptions?.target).toBe('es5');
	});

	test('explicit 5.x with module=node16: target derives to es2022 (not es5)', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({
				compilerOptions: { module: 'node16' },
			}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: '5.9.2',
		});
		expect(result.config.compilerOptions?.target).toBe('es2022');
	});

	test('explicit 5.x with module=nodenext: target derives to esnext', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({
				compilerOptions: { module: 'nodenext' },
			}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: '5.9.2',
		});
		expect(result.config.compilerOptions?.target).toBe('esnext');
	});

	test('explicit 4.x with module=node16: target derives to es2022 (not es3)', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({
				compilerOptions: { module: 'node16' },
			}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: '4.9.5',
		});
		expect(result.config.compilerOptions?.target).toBe('es2022');
	});

	test('unparseable version is a silent no-op', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: 'not-a-version',
		});
		expect(result.config.compilerOptions).toStrictEqual({});
	});

	test('bare major version applies that major\'s deltas', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: '6',
		});
		expect(result.config.compilerOptions?.moduleResolution).toBe('bundler');
	});

	test('v-prefixed version is accepted', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: 'v6.0.0',
		});
		expect(result.config.compilerOptions?.moduleResolution).toBe('bundler');
	});

	test('pre-release version is treated as its major', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({}),
		});

		for (const version of ['6.0.0-beta', '6.0.0-rc.1', '6.0.0-dev.20260101']) {
			const result = readTsconfig(fixture.getPath('tsconfig.json'), {
				typescriptVersion: version,
			});
			expect(result.config.compilerOptions?.moduleResolution).toBe('bundler');
		}
	});

	test('future-major version still applies all known prior deltas', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: '99.0.0',
		});
		expect(result.config.compilerOptions?.moduleResolution).toBe('bundler');
	});

	test('explicit 6.0: applies TS 6 defaults', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: '6.0.0',
		});
		const { compilerOptions } = result.config;

		expect(compilerOptions?.strict).toBe(true);
		expect(compilerOptions?.target).toBe('es2025');
		expect(compilerOptions?.module).toBe('es2022');
		expect(compilerOptions?.moduleResolution).toBe('bundler');
		expect(compilerOptions?.rootDir).toBe('.');
		expect(compilerOptions?.types).toStrictEqual([]);
		expect(compilerOptions?.noUncheckedSideEffectImports).toBe(true);
		expect(compilerOptions?.libReplacement).toBe(false);
	});

	test('explicit 6.0: user-set values are preserved', async () => {
		await using fixture = await createFixture({
			'tsconfig.json': createTsconfigJson({
				compilerOptions: {
					strict: false,
					moduleResolution: 'node10',
				},
			}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: '6.0.0',
		});
		expect(result.config.compilerOptions?.strict).toBe(false);
		expect(result.config.compilerOptions?.moduleResolution).toBe('node10');
	});

	describe('auto detection', () => {
		test('detects from sibling node_modules/typescript', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({}),
				'node_modules/typescript/package.json': createPackageJson({
					name: 'typescript',
					version: '6.0.0-beta',
				}),
			});

			const result = readTsconfig(fixture.getPath('tsconfig.json'), {
				typescriptVersion: 'auto',
			});
			expect(result.config.compilerOptions?.moduleResolution).toBe('bundler');
		});

		test('walks up to find node_modules/typescript', async () => {
			await using fixture = await createFixture({
				'node_modules/typescript/package.json': createPackageJson({
					name: 'typescript',
					version: '6.0.0',
				}),
				'packages/app/tsconfig.json': createTsconfigJson({}),
			});

			const result = readTsconfig(
				fixture.getPath('packages/app/tsconfig.json'),
				{ typescriptVersion: 'auto' },
			);
			expect(result.config.compilerOptions?.strict).toBe(true);
		});

		test('no defaults when typescript is not installed', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({}),
			});

			const result = readTsconfig(fixture.getPath('tsconfig.json'), {
				typescriptVersion: 'auto',
			});
			expect(result.config.compilerOptions).toStrictEqual({});
		});

		test('5.x detected: target defaults to es5', async () => {
			await using fixture = await createFixture({
				'tsconfig.json': createTsconfigJson({}),
				'node_modules/typescript/package.json': createPackageJson({
					name: 'typescript',
					version: '5.9.2',
				}),
			});

			const result = readTsconfig(fixture.getPath('tsconfig.json'), {
				typescriptVersion: 'auto',
			});
			expect(result.config.compilerOptions?.target).toBe('es5');
		});

		test('malformed package.json: no defaults applied', async () => {
			// First hit wins (matches tsc behavior). A broken typescript
			// install means we treat detection as failed rather than
			// silently walking past it — that would mask real problems.
			await using fixture = await createFixture({
				'node_modules/typescript/package.json': '{ not valid json',
				'tsconfig.json': createTsconfigJson({}),
			});

			const result = readTsconfig(fixture.getPath('tsconfig.json'), {
				typescriptVersion: 'auto',
			});
			expect(result.config.compilerOptions).toStrictEqual({});
		});

		test('package.json without a version: no defaults applied', async () => {
			await using fixture = await createFixture({
				'node_modules/typescript/package.json': createPackageJson({
					name: 'typescript',
				}),
				'tsconfig.json': createTsconfigJson({}),
			});

			const result = readTsconfig(fixture.getPath('tsconfig.json'), {
				typescriptVersion: 'auto',
			});
			expect(result.config.compilerOptions).toStrictEqual({});
		});

		describe('Yarn Berry pnp', () => {
			// Yarn Berry pnp projects have no `node_modules` directory, so
			// the upward walk would never find typescript. We hook
			// `Module.findPnpApi` to simulate a pnp-resolved typescript install.
			// (The full end-to-end pnp test that spawns a child process under
			// `--require .pnp.cjs` lives in extends-resolution/yarn-pnp.spec.ts;
			// here we only validate that the detection wiring uses pnp when
			// available.)
			const stubPnpApi = (resolveRequest: (request: string) => string | null) => {
				const moduleAny = Module as unknown as { findPnpApi?: unknown };
				const original = moduleAny.findPnpApi;
				moduleAny.findPnpApi = () => ({ resolveRequest });
				return () => {
					moduleAny.findPnpApi = original;
				};
			};

			test('detects via pnpApi.resolveRequest (no node_modules on disk)', async () => {
				await using fixture = await createFixture({
					'fake-typescript/package.json': createPackageJson({
						name: 'typescript',
						version: '6.0.0',
					}),
					'tsconfig.json': createTsconfigJson({}),
				});

				const restore = stubPnpApi((request) => {
					if (request === 'typescript/package.json') {
						return fixture.getPath('fake-typescript/package.json');
					}
					return null;
				});

				try {
					const result = readTsconfig(fixture.getPath('tsconfig.json'), {
						typescriptVersion: 'auto',
					});
					expect(result.config.compilerOptions?.moduleResolution).toBe('bundler');
				} finally {
					restore();
				}
			});

			test('falls back to node_modules walk when pnp resolution fails', async () => {
				await using fixture = await createFixture({
					'node_modules/typescript/package.json': createPackageJson({
						name: 'typescript',
						version: '5.9.0',
					}),
					'tsconfig.json': createTsconfigJson({}),
				});

				const restore = stubPnpApi(() => {
					throw new Error('pnp resolution failed');
				});

				try {
					const result = readTsconfig(fixture.getPath('tsconfig.json'), {
						typescriptVersion: 'auto',
					});
					// pnp threw → fell back to findUp → found 5.9.0 → target=es5.
					expect(result.config.compilerOptions?.target).toBe('es5');
				} finally {
					restore();
				}
			});

			test('pnp resolves but file is missing: detection returns no version', async () => {
				await using fixture = await createFixture({
					'tsconfig.json': createTsconfigJson({}),
				});

				const restore = stubPnpApi(() => '/nonexistent/typescript/package.json');

				try {
					const result = readTsconfig(fixture.getPath('tsconfig.json'), {
						typescriptVersion: 'auto',
					});
					expect(result.config.compilerOptions).toStrictEqual({});
				} finally {
					restore();
				}
			});
		});
	});

	test('extends inherits version-aware defaults from leaf', async () => {
		await using fixture = await createFixture({
			'base.json': createTsconfigJson({
				compilerOptions: { strict: false },
			}),
			'tsconfig.json': createTsconfigJson({
				extends: './base.json',
			}),
		});

		const result = readTsconfig(fixture.getPath('tsconfig.json'), {
			typescriptVersion: '6.0.0',
		});
		// User explicitly set strict: false in base — must win over default.
		expect(result.config.compilerOptions?.strict).toBe(false);
		// But moduleResolution wasn't set anywhere — default applies.
		expect(result.config.compilerOptions?.moduleResolution).toBe('bundler');
	});
});
