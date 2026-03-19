import { describe, test, expect } from 'manten';
import { resolvePathAlias, type TsconfigResult } from '#get-tsconfig';
import { isWindows, tsconfigPath, projectDir } from '../utils/unit-helpers.ts';

const makeTsconfig = (compilerOptions: Record<string, unknown> = {}): TsconfigResult => ({
	path: tsconfigPath,
	config: { compilerOptions },
});

describe('resolvePathAlias', () => {
	describe('no paths configured', () => {
		test('no compilerOptions returns empty', () => {
			const tsconfig: TsconfigResult = {
				path: `${projectDir}/tsconfig.json`,
				config: {},
			};
			expect(resolvePathAlias(tsconfig, 'foo')).toStrictEqual([]);
		});

		test('no paths and no baseUrl returns empty', () => {
			const tsconfig = makeTsconfig({});
			expect(resolvePathAlias(tsconfig, 'foo')).toStrictEqual([]);
		});

		test('baseUrl only returns baseUrl/specifier', () => {
			const tsconfig = makeTsconfig({ baseUrl: '.' });
			expect(resolvePathAlias(tsconfig, 'foo')).toStrictEqual([
				`${projectDir}/foo`,
			]);
		});

		test('empty paths object with baseUrl falls back to baseUrl/specifier', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: {},
			});
			expect(resolvePathAlias(tsconfig, 'foo')).toStrictEqual([
				`${projectDir}/foo`,
			]);
		});
	});

	describe('exact match', () => {
		test('pattern without wildcard matches exactly', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { jquery: ['./vendor/jquery.js'] },
			});
			expect(resolvePathAlias(tsconfig, 'jquery')).toStrictEqual([
				`${projectDir}/vendor/jquery.js`,
			]);
		});

		test('multiple substitutions for exact pattern', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { lodash: ['./vendor/lodash.js', './fallback/lodash.js'] },
			});
			expect(resolvePathAlias(tsconfig, 'lodash')).toStrictEqual([
				`${projectDir}/vendor/lodash.js`,
				`${projectDir}/fallback/lodash.js`,
			]);
		});

		test('exact match takes priority over wildcard', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: {
					utils: ['./exact/utils.js'],
					'utils/*': ['./wildcard/*'],
				},
			});
			expect(resolvePathAlias(tsconfig, 'utils')).toStrictEqual([
				`${projectDir}/exact/utils.js`,
			]);
		});

		test('exact pattern does not match other specifiers', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { jquery: ['./vendor/jquery.js'] },
			});
			expect(resolvePathAlias(tsconfig, 'react')).toStrictEqual([
				`${projectDir}/react`,
			]);
		});
	});

	describe('wildcard match', () => {
		test('single wildcard replaces matched portion', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@/*': ['./src/*'] },
			});
			expect(resolvePathAlias(tsconfig, '@/foo')).toStrictEqual([
				`${projectDir}/src/foo`,
			]);
		});

		test('longest prefix wins when multiple patterns match', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: {
					'*': ['./fallback/*'],
					'@/*': ['./at/*'],
					'@/components/*': ['./components/*'],
				},
			});
			expect(resolvePathAlias(tsconfig, '@/components/Button')).toStrictEqual([
				`${projectDir}/components/Button`,
			]);
		});

		test('bare wildcard matches any non-relative specifier', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '*': ['./modules/*'] },
			});
			expect(resolvePathAlias(tsconfig, 'anything')).toStrictEqual([
				`${projectDir}/modules/anything`,
			]);
		});

		test('wildcard with suffix', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '*.js': ['./compiled/*.js'] },
			});
			expect(resolvePathAlias(tsconfig, 'utils.js')).toStrictEqual([
				`${projectDir}/compiled/utils.js`,
			]);
		});

		test('prefix and suffix pattern', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { 'prefix-*-suffix': ['./mapped/*'] },
			});
			expect(resolvePathAlias(tsconfig, 'prefix-middle-suffix')).toStrictEqual([
				`${projectDir}/mapped/middle`,
			]);
		});
	});

	describe('substitution', () => {
		test('wildcard in substitution replaced with matched portion', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@app/*': ['./src/app/*'] },
			});
			expect(resolvePathAlias(tsconfig, '@app/services/auth')).toStrictEqual([
				`${projectDir}/src/app/services/auth`,
			]);
		});

		test('multiple substitutions all returned', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@/*': ['./src/*', './lib/*', './generated/*'] },
			});
			expect(resolvePathAlias(tsconfig, '@/utils')).toStrictEqual([
				`${projectDir}/src/utils`,
				`${projectDir}/lib/utils`,
				`${projectDir}/generated/utils`,
			]);
		});

		test('substitution without wildcard returns literal path', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@app/*': ['./src/app/index.js'] },
			});
			expect(resolvePathAlias(tsconfig, '@app/anything')).toStrictEqual([
				`${projectDir}/src/app/index.js`,
			]);
		});
	});

	describe('baseUrl resolution', () => {
		test('relative baseUrl resolved against tsconfig directory', () => {
			const tsconfig = makeTsconfig({
				baseUrl: './src',
				paths: { '@/*': ['./*'] },
			});
			expect(resolvePathAlias(tsconfig, '@/foo')).toStrictEqual([
				`${projectDir}/src/foo`,
			]);
		});

		test('relative baseUrl with parent directory', () => {
			const tsconfig: TsconfigResult = {
				path: `${projectDir}/config/tsconfig.json`,
				config: { compilerOptions: { baseUrl: '../src' } },
			};
			expect(resolvePathAlias(tsconfig, 'foo')).toStrictEqual([
				`${projectDir}/src/foo`,
			]);
		});

		test('fallback to baseUrl/specifier when no pattern matches', () => {
			const tsconfig = makeTsconfig({
				baseUrl: './src',
				paths: { '@/*': ['./*'] },
			});
			expect(resolvePathAlias(tsconfig, 'unmatched/module')).toStrictEqual([
				`${projectDir}/src/unmatched/module`,
			]);
		});

		test('no baseUrl and no match returns empty', () => {
			const tsconfig = makeTsconfig({
				paths: { '@/*': ['./*'] },
			});
			expect(resolvePathAlias(tsconfig, 'unmatched')).toStrictEqual([]);
		});

		test('baseUrl with subdirectory', () => {
			const tsconfig = makeTsconfig({
				baseUrl: './packages/core/src',
			});
			expect(resolvePathAlias(tsconfig, 'utils')).toStrictEqual([
				`${projectDir}/packages/core/src/utils`,
			]);
		});
	});

	describe('relative specifiers', () => {
		test('./foo returns empty', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '*': ['./*'] },
			});
			expect(resolvePathAlias(tsconfig, './foo')).toStrictEqual([]);
		});

		test('../foo returns empty', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '*': ['./*'] },
			});
			expect(resolvePathAlias(tsconfig, '../foo')).toStrictEqual([]);
		});

		test('. returns empty', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '*': ['./*'] },
			});
			expect(resolvePathAlias(tsconfig, '.')).toStrictEqual([]);
		});

		test('.. returns empty', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '*': ['./*'] },
			});
			expect(resolvePathAlias(tsconfig, '..')).toStrictEqual([]);
		});
	});

	describe('validation errors', () => {
		test('multiple wildcards in pattern throws', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@/*/*': ['./*'] },
			});
			expect(() => resolvePathAlias(tsconfig, '@/a/b')).toThrow(
				"Pattern '@/*/*' can have at most one '*' character.",
			);
		});

		test('multiple wildcards in substitution throws', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@/*': ['./*/*'] },
			});
			expect(() => resolvePathAlias(tsconfig, '@/foo')).toThrow(
				"Substitution './*/*' in pattern '@/*' can have at most one '*' character.",
			);
		});

		test('non-relative substitution without baseUrl throws', () => {
			const tsconfig = makeTsconfig({
				paths: { '@/*': ['src/*'] },
			});
			expect(() => resolvePathAlias(tsconfig, '@/foo')).toThrow(
				"Non-relative paths are not allowed when 'baseUrl' is not set. Did you forget a leading './'?",
			);
		});
	});

	describe('caching', () => {
		test('same tsconfig object uses cached compilation', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@/*': ['./src/*'] },
			});
			const result1 = resolvePathAlias(tsconfig, '@/foo');
			const result2 = resolvePathAlias(tsconfig, '@/bar');
			expect(result1).toStrictEqual([`${projectDir}/src/foo`]);
			expect(result2).toStrictEqual([`${projectDir}/src/bar`]);
		});

		test('different tsconfig objects are independent', () => {
			const tsconfig1 = makeTsconfig({
				baseUrl: '.',
				paths: { '@/*': ['./src/*'] },
			});
			const tsconfig2 = makeTsconfig({
				baseUrl: '.',
				paths: { '@/*': ['./lib/*'] },
			});
			expect(resolvePathAlias(tsconfig1, '@/foo')).toStrictEqual([
				`${projectDir}/src/foo`,
			]);
			expect(resolvePathAlias(tsconfig2, '@/foo')).toStrictEqual([
				`${projectDir}/lib/foo`,
			]);
		});
	});

	describe('edge cases', () => {
		test('pattern with empty prefix (bare wildcard)', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '*': ['./vendor/*'] },
			});
			expect(resolvePathAlias(tsconfig, 'react')).toStrictEqual([
				`${projectDir}/vendor/react`,
			]);
		});

		test('specifier matching prefix and suffix exactly with empty capture', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { 'prefix*suffix': ['./out/*'] },
			});
			expect(resolvePathAlias(tsconfig, 'prefixsuffix')).toStrictEqual([
				`${projectDir}/out/`,
			]);
		});

		test('paths with no matching patterns and no baseUrl returns empty', () => {
			const tsconfig = makeTsconfig({
				paths: { '@/*': ['./*'] },
			});
			expect(resolvePathAlias(tsconfig, 'unmatched')).toStrictEqual([]);
		});

		test('deep nested specifier', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@/*': ['./src/*'] },
			});
			expect(resolvePathAlias(tsconfig, '@/a/b/c/d/e')).toStrictEqual([
				`${projectDir}/src/a/b/c/d/e`,
			]);
		});

		test('specifier with special characters', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@scope/*': ['./packages/*'] },
			});
			expect(resolvePathAlias(tsconfig, '@scope/my-pkg')).toStrictEqual([
				`${projectDir}/packages/my-pkg`,
			]);
		});

		test('paths without baseUrl using relative substitutions', () => {
			const tsconfig = makeTsconfig({
				paths: { '@/*': ['./*'] },
			});
			expect(resolvePathAlias(tsconfig, '@/foo')).toStrictEqual([
				`${projectDir}/foo`,
			]);
		});

		test('unmatched specifier falls back to baseUrl join', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@/*': ['./src/*'] },
			});
			// specifier doesn't match any pattern, falls back to baseUrl/specifier
			expect(resolvePathAlias(tsconfig, '@libs/constants')).toStrictEqual([
				`${projectDir}/@libs/constants`,
			]);
		});
	});

	describe('additional edge cases', () => {
		test('empty paths object without baseUrl returns empty', () => {
			const tsconfig = makeTsconfig({ paths: {} });
			expect(resolvePathAlias(tsconfig, 'foo')).toStrictEqual([]);
		});

		test('substitution with absolute path', () => {
			const absoluteDir = isWindows ? 'C:/absolute/src' : '/absolute/src';
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@/*': [`${absoluteDir}/*`] },
			});
			expect(resolvePathAlias(tsconfig, '@/foo')).toStrictEqual([
				`${absoluteDir}/foo`,
			]);
		});

		test('multi-star pattern error includes the pattern', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@/**/*': ['./src/*'] },
			});
			expect(() => resolvePathAlias(tsconfig, '@/foo/bar')).toThrow(/@\/\*\*\/\*/);
		});

		test('multi-star substitution error includes the substitution', () => {
			const tsconfig = makeTsconfig({
				baseUrl: '.',
				paths: { '@/*': ['./src/*/*'] },
			});
			expect(() => resolvePathAlias(tsconfig, '@/foo')).toThrow(/src\/\*\/\*/);
		});
	});
});
