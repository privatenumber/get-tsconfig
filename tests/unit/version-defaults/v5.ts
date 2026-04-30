import { describe, test, expect } from 'manten';
import type { TsconfigJson } from '../../../src/types.ts';
import { applyV5Defaults } from '../../../src/version-defaults/v5.ts';

describe('applyV5Defaults', () => {
	test('defaults target to es5 on empty input', () => {
		const compilerOptions = {};
		applyV5Defaults(compilerOptions, new Set());
		expect(compilerOptions).toStrictEqual({ target: 'es5' });
	});

	test('user-set target is preserved', () => {
		const compilerOptions = { target: 'esnext' as const };
		applyV5Defaults(compilerOptions, new Set(Object.keys(compilerOptions)));
		expect(compilerOptions.target).toBe('esnext');
	});

	for (const module of ['node16', 'node18', 'node20', 'nodenext'] as const) {
		test(`skips target fallback when module=${module} (lets normalize derive)`, () => {
			const compilerOptions: TsconfigJson.CompilerOptions = { module };
			applyV5Defaults(compilerOptions, new Set(['module']));
			expect(compilerOptions.target).toBeUndefined();
		});
	}
});
