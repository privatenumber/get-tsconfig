import { describe, test, expect } from 'manten';
import { normalizeCompilerOptions } from '../../src/read-tsconfig/normalize-compiler-options.ts';

describe('normalizeCompilerOptions', () => {
	test('empty options', () => {
		expect(normalizeCompilerOptions({})).toStrictEqual({});
	});

	describe('strict', () => {
		test('implies all strict flags', () => {
			const result = normalizeCompilerOptions({ strict: true });
			expect(result).toStrictEqual({
				strict: true,
				noImplicitAny: true,
				noImplicitThis: true,
				strictNullChecks: true,
				strictFunctionTypes: true,
				strictBindCallApply: true,
				strictPropertyInitialization: true,
				strictBuiltinIteratorReturn: true,
				alwaysStrict: true,
				useUnknownInCatchVariables: true,
			});
		});

		test('does not override explicit false', () => {
			const result = normalizeCompilerOptions({
				strict: true,
				noImplicitAny: false,
				strictNullChecks: false,
			});
			expect(result.noImplicitAny).toBe(false);
			expect(result.strictNullChecks).toBe(false);
			expect(result.strictFunctionTypes).toBe(true);
		});

		test('strict: false does not imply flags', () => {
			const result = normalizeCompilerOptions({ strict: false });
			expect(result).toStrictEqual({ strict: false });
		});
	});

	describe('composite', () => {
		test('implies declaration and incremental', () => {
			const result = normalizeCompilerOptions({ composite: true });
			expect(result.declaration).toBe(true);
			expect(result.incremental).toBe(true);
		});

		test('does not override explicit values', () => {
			const result = normalizeCompilerOptions({
				composite: true,
				declaration: false,
				incremental: false,
			});
			expect(result.declaration).toBe(false);
			expect(result.incremental).toBe(false);
		});
	});

	describe('target', () => {
		test('normalizes to lowercase', () => {
			expect(normalizeCompilerOptions({ target: 'ESNext' }).target).toBe('esnext');
			expect(normalizeCompilerOptions({ target: 'ES2022' }).target).toBe('es2022');
		});

		test('normalizes es2015 to es6', () => {
			expect(normalizeCompilerOptions({ target: 'es2015' }).target).toBe('es6');
		});

		test('esnext implies module: es6', () => {
			const result = normalizeCompilerOptions({ target: 'esnext' });
			expect(result.module).toBe('es6');
		});

		test('esnext implies useDefineForClassFields', () => {
			const result = normalizeCompilerOptions({ target: 'esnext' });
			expect(result.useDefineForClassFields).toBe(true);
		});

		test('es6 through es2024 imply module: es6', () => {
			for (const target of ['es6', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'es2022', 'es2023', 'es2024'] as const) {
				const result = normalizeCompilerOptions({ target });
				expect(result.module).toBe('es6');
			}
		});

		test('es2022+ implies useDefineForClassFields', () => {
			for (const target of ['es2022', 'es2023', 'es2024'] as const) {
				const result = normalizeCompilerOptions({ target });
				expect(result.useDefineForClassFields).toBe(true);
			}
		});

		test('es2021 does not imply useDefineForClassFields', () => {
			const result = normalizeCompilerOptions({ target: 'es2021' });
			expect(result.useDefineForClassFields).toBeUndefined();
		});

		test('es5 does not imply module', () => {
			const result = normalizeCompilerOptions({ target: 'es5' });
			expect(result.module).toBeUndefined();
		});

		test('does not override explicit module', () => {
			const result = normalizeCompilerOptions({
				target: 'esnext',
				module: 'commonjs',
			});
			expect(result.module).toBe('commonjs');
		});
	});

	describe('module', () => {
		test('normalizes to lowercase', () => {
			expect(normalizeCompilerOptions({ module: 'CommonJS' }).module).toBe('commonjs');
			expect(normalizeCompilerOptions({ module: 'ESNext' }).module).toBe('esnext');
		});

		test('normalizes es2015 to es6', () => {
			expect(normalizeCompilerOptions({ module: 'es2015' }).module).toBe('es6');
		});

		describe('moduleResolution implications', () => {
			test('es6 implies classic', () => {
				expect(normalizeCompilerOptions({ module: 'es6' }).moduleResolution).toBe('classic');
			});

			test('es2020 implies classic', () => {
				expect(normalizeCompilerOptions({ module: 'es2020' }).moduleResolution).toBe('classic');
			});

			test('es2022 implies classic', () => {
				expect(normalizeCompilerOptions({ module: 'es2022' }).moduleResolution).toBe('classic');
			});

			test('esnext implies classic', () => {
				expect(normalizeCompilerOptions({ module: 'esnext' }).moduleResolution).toBe('classic');
			});

			test('none implies classic', () => {
				expect(normalizeCompilerOptions({ module: 'none' }).moduleResolution).toBe('classic');
			});

			test('system implies classic', () => {
				expect(normalizeCompilerOptions({ module: 'system' }).moduleResolution).toBe('classic');
			});

			test('umd implies classic', () => {
				expect(normalizeCompilerOptions({ module: 'umd' }).moduleResolution).toBe('classic');
			});

			test('amd implies classic', () => {
				expect(normalizeCompilerOptions({ module: 'amd' }).moduleResolution).toBe('classic');
			});

			test('commonjs does not imply classic', () => {
				expect(normalizeCompilerOptions({ module: 'commonjs' }).moduleResolution).toBeUndefined();
			});
		});

		test('system implies allowSyntheticDefaultImports', () => {
			const result = normalizeCompilerOptions({ module: 'system' });
			expect(result.allowSyntheticDefaultImports).toBe(true);
		});

		describe('node16', () => {
			test('implies esModuleInterop and allowSyntheticDefaultImports', () => {
				const result = normalizeCompilerOptions({ module: 'node16' });
				expect(result.esModuleInterop).toBe(true);
				expect(result.allowSyntheticDefaultImports).toBe(true);
			});

			test('implies moduleDetection: force', () => {
				expect(normalizeCompilerOptions({ module: 'node16' }).moduleDetection).toBe('force');
			});

			test('implies target: es2022', () => {
				expect(normalizeCompilerOptions({ module: 'node16' }).target).toBe('es2022');
			});

			test('implies moduleResolution: node16', () => {
				expect(normalizeCompilerOptions({ module: 'node16' }).moduleResolution).toBe('node16');
			});

			test('implies useDefineForClassFields (effective target es2022)', () => {
				expect(normalizeCompilerOptions({ module: 'node16' }).useDefineForClassFields).toBe(true);
			});
		});

		describe('node18', () => {
			test('implies target: es2022', () => {
				expect(normalizeCompilerOptions({ module: 'node18' }).target).toBe('es2022');
			});

			test('implies moduleResolution: node16', () => {
				expect(normalizeCompilerOptions({ module: 'node18' }).moduleResolution).toBe('node16');
			});

			test('implies useDefineForClassFields', () => {
				expect(normalizeCompilerOptions({ module: 'node18' }).useDefineForClassFields).toBe(true);
			});
		});

		describe('node20', () => {
			test('implies target: es2023', () => {
				expect(normalizeCompilerOptions({ module: 'node20' }).target).toBe('es2023');
			});

			test('implies moduleResolution: node16', () => {
				expect(normalizeCompilerOptions({ module: 'node20' }).moduleResolution).toBe('node16');
			});

			test('implies resolveJsonModule', () => {
				expect(normalizeCompilerOptions({ module: 'node20' }).resolveJsonModule).toBe(true);
			});

			test('implies useDefineForClassFields', () => {
				expect(normalizeCompilerOptions({ module: 'node20' }).useDefineForClassFields).toBe(true);
			});
		});

		describe('nodenext', () => {
			test('implies target: esnext', () => {
				expect(normalizeCompilerOptions({ module: 'nodenext' }).target).toBe('esnext');
			});

			test('implies moduleResolution: nodenext', () => {
				expect(normalizeCompilerOptions({ module: 'nodenext' }).moduleResolution).toBe('nodenext');
			});

			test('implies resolveJsonModule', () => {
				expect(normalizeCompilerOptions({ module: 'nodenext' }).resolveJsonModule).toBe(true);
			});

			test('implies useDefineForClassFields', () => {
				expect(normalizeCompilerOptions({ module: 'nodenext' }).useDefineForClassFields).toBe(true);
			});
		});

		describe('preserve', () => {
			test('implies esModuleInterop and allowSyntheticDefaultImports', () => {
				const result = normalizeCompilerOptions({ module: 'preserve' });
				expect(result.esModuleInterop).toBe(true);
				expect(result.allowSyntheticDefaultImports).toBe(true);
			});

			test('implies moduleResolution: bundler', () => {
				expect(normalizeCompilerOptions({ module: 'preserve' }).moduleResolution).toBe('bundler');
			});

			test('does not imply moduleDetection: force', () => {
				expect(normalizeCompilerOptions({ module: 'preserve' }).moduleDetection).toBeUndefined();
			});
		});

		test('useDefineForClassFields not implied when explicit target < es2022', () => {
			const result = normalizeCompilerOptions({
				target: 'es5',
				module: 'node16',
			});
			expect(result.useDefineForClassFields).toBeUndefined();
		});

		test('useDefineForClassFields implied when explicit target is es3 (treated as unset)', () => {
			const result = normalizeCompilerOptions({
				target: 'es3',
				module: 'node16',
			});
			expect(result.useDefineForClassFields).toBe(true);
		});

		test('does not override explicit moduleResolution', () => {
			const result = normalizeCompilerOptions({
				module: 'esnext',
				moduleResolution: 'bundler',
			});
			expect(result.moduleResolution).toBe('bundler');
		});
	});

	describe('moduleResolution', () => {
		test('normalizes to lowercase', () => {
			expect(normalizeCompilerOptions({ moduleResolution: 'Node16' }).moduleResolution).toBe('node16');
		});

		test('normalizes node to node10', () => {
			expect(normalizeCompilerOptions({ moduleResolution: 'node' }).moduleResolution).toBe('node10');
		});

		test('node16 implies resolvePackageJsonExports and Imports', () => {
			const result = normalizeCompilerOptions({ moduleResolution: 'node16' });
			expect(result.resolvePackageJsonExports).toBe(true);
			expect(result.resolvePackageJsonImports).toBe(true);
		});

		test('nodenext implies resolvePackageJsonExports and Imports', () => {
			const result = normalizeCompilerOptions({ moduleResolution: 'nodenext' });
			expect(result.resolvePackageJsonExports).toBe(true);
			expect(result.resolvePackageJsonImports).toBe(true);
		});

		test('bundler implies allowSyntheticDefaultImports and resolveJsonModule', () => {
			const result = normalizeCompilerOptions({ moduleResolution: 'bundler' });
			expect(result.allowSyntheticDefaultImports).toBe(true);
			expect(result.resolveJsonModule).toBe(true);
		});

		test('bundler implies resolvePackageJsonExports and Imports', () => {
			const result = normalizeCompilerOptions({ moduleResolution: 'bundler' });
			expect(result.resolvePackageJsonExports).toBe(true);
			expect(result.resolvePackageJsonImports).toBe(true);
		});

		test('node10 does not imply package.json exports/imports', () => {
			const result = normalizeCompilerOptions({ moduleResolution: 'node10' });
			expect(result.resolvePackageJsonExports).toBeUndefined();
			expect(result.resolvePackageJsonImports).toBeUndefined();
		});

		test('classic does not imply anything', () => {
			const result = normalizeCompilerOptions({ moduleResolution: 'classic' });
			expect(result.resolvePackageJsonExports).toBeUndefined();
			expect(result.resolvePackageJsonImports).toBeUndefined();
			expect(result.allowSyntheticDefaultImports).toBeUndefined();
		});
	});

	describe('case normalization', () => {
		test('jsx', () => {
			// @ts-expect-error mixed case input
			expect(normalizeCompilerOptions({ jsx: 'React-JSX' }).jsx).toBe('react-jsx');
		});

		test('moduleDetection', () => {
			// @ts-expect-error mixed case input
			expect(normalizeCompilerOptions({ moduleDetection: 'Force' }).moduleDetection).toBe('force');
		});

		test('importsNotUsedAsValues', () => {
			// @ts-expect-error mixed case input
			expect(normalizeCompilerOptions({ importsNotUsedAsValues: 'Preserve' }).importsNotUsedAsValues).toBe('preserve');
		});

		test('newLine', () => {
			expect(normalizeCompilerOptions({ newLine: 'CRLF' }).newLine).toBe('crlf');
		});

		test('lib', () => {
			expect(normalizeCompilerOptions({ lib: ['ES2020', 'DOM'] }).lib).toStrictEqual(['es2020', 'dom']);
		});
	});

	describe('esModuleInterop', () => {
		test('implies allowSyntheticDefaultImports', () => {
			const result = normalizeCompilerOptions({ esModuleInterop: true });
			expect(result.allowSyntheticDefaultImports).toBe(true);
		});

		test('does not override explicit false', () => {
			const result = normalizeCompilerOptions({
				esModuleInterop: true,
				allowSyntheticDefaultImports: false,
			});
			expect(result.allowSyntheticDefaultImports).toBe(false);
		});
	});

	describe('verbatimModuleSyntax', () => {
		test('implies isolatedModules and preserveConstEnums', () => {
			const result = normalizeCompilerOptions({ verbatimModuleSyntax: true });
			expect(result.isolatedModules).toBe(true);
			expect(result.preserveConstEnums).toBe(true);
		});
	});

	describe('isolatedModules', () => {
		test('implies preserveConstEnums', () => {
			const result = normalizeCompilerOptions({ isolatedModules: true });
			expect(result.preserveConstEnums).toBe(true);
		});

		test('does not override explicit false', () => {
			const result = normalizeCompilerOptions({
				isolatedModules: true,
				preserveConstEnums: false,
			});
			expect(result.preserveConstEnums).toBe(false);
		});
	});

	describe('rewriteRelativeImportExtensions', () => {
		test('implies allowImportingTsExtensions', () => {
			const result = normalizeCompilerOptions({ rewriteRelativeImportExtensions: true });
			expect(result.allowImportingTsExtensions).toBe(true);
		});

		test('does not override explicit false', () => {
			const result = normalizeCompilerOptions({
				rewriteRelativeImportExtensions: true,
				allowImportingTsExtensions: false,
			});
			expect(result.allowImportingTsExtensions).toBe(false);
		});

		test('false does not imply anything', () => {
			const result = normalizeCompilerOptions({ rewriteRelativeImportExtensions: false });
			expect(result.allowImportingTsExtensions).toBeUndefined();
		});
	});

	describe('checkJs', () => {
		test('implies allowJs', () => {
			const result = normalizeCompilerOptions({ checkJs: true });
			expect(result.allowJs).toBe(true);
		});

		test('does not override explicit false', () => {
			const result = normalizeCompilerOptions({
				checkJs: true,
				allowJs: false,
			});
			expect(result.allowJs).toBe(false);
		});
	});

	describe('interaction ordering', () => {
		test('module: nodenext then moduleResolution cascades', () => {
			const result = normalizeCompilerOptions({ module: 'nodenext' });
			// nodenext → moduleResolution: nodenext → resolvePackageJsonExports/Imports
			expect(result.moduleResolution).toBe('nodenext');
			expect(result.resolvePackageJsonExports).toBe(true);
			expect(result.resolvePackageJsonImports).toBe(true);
		});

		test('module: preserve then moduleResolution: bundler cascades', () => {
			const result = normalizeCompilerOptions({ module: 'preserve' });
			expect(result.moduleResolution).toBe('bundler');
			expect(result.resolvePackageJsonExports).toBe(true);
			expect(result.resolvePackageJsonImports).toBe(true);
			expect(result.resolveJsonModule).toBe(true);
		});

		test('strict + module: nodenext combined', () => {
			const result = normalizeCompilerOptions({
				strict: true,
				module: 'nodenext',
			});
			expect(result.noImplicitAny).toBe(true);
			expect(result.target).toBe('esnext');
			expect(result.moduleResolution).toBe('nodenext');
			expect(result.esModuleInterop).toBe(true);
			expect(result.allowSyntheticDefaultImports).toBe(true);
		});

		test('target: es2022 + module: preserve', () => {
			const result = normalizeCompilerOptions({
				target: 'es2022',
				module: 'preserve',
			});
			expect(result.useDefineForClassFields).toBe(true);
			expect(result.moduleResolution).toBe('bundler');
			expect(result.esModuleInterop).toBe(true);
		});
	});
});
