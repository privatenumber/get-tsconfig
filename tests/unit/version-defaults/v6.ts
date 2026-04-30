import { describe, test, expect } from 'manten';
import { applyV6Defaults } from '../../../src/version-defaults/v6.ts';

describe('applyV6Defaults', () => {
	test('applies all deltas on empty input', () => {
		const compilerOptions = {};
		applyV6Defaults(compilerOptions, new Set());
		expect(compilerOptions).toStrictEqual({
			strict: true,
			target: 'es2025',
			module: 'es2022',
			moduleResolution: 'bundler',
			rootDir: '.',
			types: [],
			noUncheckedSideEffectImports: true,
			libReplacement: false,
		});
	});

	test('user-set fields are not overwritten', () => {
		const compilerOptions = {
			strict: false,
			target: 'es2020' as const,
			moduleResolution: 'node10' as const,
			types: ['node'],
		};
		const userSet = new Set(Object.keys(compilerOptions));
		applyV6Defaults(compilerOptions, userSet);
		expect(compilerOptions.strict).toBe(false);
		expect(compilerOptions.target).toBe('es2020');
		expect(compilerOptions.moduleResolution).toBe('node10');
		expect(compilerOptions.types).toStrictEqual(['node']);
		// Unset fields still get defaults.
		expect(compilerOptions).toMatchObject({
			module: 'es2022',
			rootDir: '.',
			noUncheckedSideEffectImports: true,
			libReplacement: false,
		});
	});

	test('user-set false / falsy values are preserved', () => {
		const compilerOptions = {
			strict: false,
			noUncheckedSideEffectImports: false,
			libReplacement: true,
		};
		applyV6Defaults(compilerOptions, new Set(Object.keys(compilerOptions)));
		expect(compilerOptions.strict).toBe(false);
		expect(compilerOptions.noUncheckedSideEffectImports).toBe(false);
		expect(compilerOptions.libReplacement).toBe(true);
	});

	test('user-set empty array for types is preserved', () => {
		const compilerOptions = { types: [] };
		const before = compilerOptions.types;
		applyV6Defaults(compilerOptions, new Set(['types']));
		expect(compilerOptions.types).toBe(before);
	});
});
