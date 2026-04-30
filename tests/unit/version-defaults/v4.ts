import { describe, test, expect } from 'manten';
import type { TsconfigJson } from '../../../src/types.ts';
import { applyV4Defaults } from '../../../src/version-defaults/v4.ts';

describe('applyV4Defaults', () => {
	test('defaults target to es3 on empty input', () => {
		const compilerOptions = {};
		applyV4Defaults(compilerOptions, new Set());
		expect(compilerOptions).toStrictEqual({ target: 'es3' });
	});

	test('user-set target is preserved', () => {
		const compilerOptions = { target: 'es2020' as const };
		applyV4Defaults(compilerOptions, new Set(Object.keys(compilerOptions)));
		expect(compilerOptions.target).toBe('es2020');
	});

	for (const module of ['node16', 'node18', 'node20', 'nodenext'] as const) {
		test(`skips target fallback when module=${module} (lets normalize derive)`, () => {
			const compilerOptions: TsconfigJson.CompilerOptions = { module };
			applyV4Defaults(compilerOptions, new Set(['module']));
			expect(compilerOptions.target).toBeUndefined();
		});
	}
});
