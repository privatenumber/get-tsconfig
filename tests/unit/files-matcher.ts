import { describe, test, expect } from 'manten';
import { isFileIncluded, type TsconfigResult } from '#get-tsconfig';
import {
	isWindows, projectDir, makeTsconfig, file,
} from '../utils/unit-helpers.ts';

describe('isFileIncluded (unit)', () => {
	describe('extension detection', () => {
		test('.ts matches default include', () => {
			expect(isFileIncluded(makeTsconfig(), file('src/index.ts'))).toBe(true);
		});

		test('.tsx matches default include', () => {
			expect(isFileIncluded(makeTsconfig(), file('src/index.tsx'))).toBe(true);
		});

		test('.d.ts matches default include', () => {
			expect(isFileIncluded(makeTsconfig(), file('src/types.d.ts'))).toBe(true);
		});

		test('.mts matches default include', () => {
			expect(isFileIncluded(makeTsconfig(), file('src/index.mts'))).toBe(true);
		});

		test('.d.mts matches default include', () => {
			expect(isFileIncluded(makeTsconfig(), file('src/types.d.mts'))).toBe(true);
		});

		test('.cts matches default include', () => {
			expect(isFileIncluded(makeTsconfig(), file('src/index.cts'))).toBe(true);
		});

		test('.d.cts matches default include', () => {
			expect(isFileIncluded(makeTsconfig(), file('src/types.d.cts'))).toBe(true);
		});

		test('.js does NOT match by default', () => {
			expect(isFileIncluded(makeTsconfig(), file('src/index.js'))).toBe(false);
		});

		test('.js matches with allowJs', () => {
			const tsconfig = makeTsconfig({ compilerOptions: { allowJs: true } });
			expect(isFileIncluded(tsconfig, file('src/index.js'))).toBe(true);
		});

		test('.jsx matches with allowJs', () => {
			const tsconfig = makeTsconfig({ compilerOptions: { allowJs: true } });
			expect(isFileIncluded(tsconfig, file('src/index.jsx'))).toBe(true);
		});

		test('.cjs matches with allowJs', () => {
			const tsconfig = makeTsconfig({ compilerOptions: { allowJs: true } });
			expect(isFileIncluded(tsconfig, file('src/index.cjs'))).toBe(true);
		});

		test('.mjs matches with allowJs', () => {
			const tsconfig = makeTsconfig({ compilerOptions: { allowJs: true } });
			expect(isFileIncluded(tsconfig, file('src/index.mjs'))).toBe(true);
		});

		test('.txt never matches', () => {
			expect(isFileIncluded(makeTsconfig(), file('src/readme.txt'))).toBe(false);
		});
	});

	describe('default include', () => {
		test('no files or include defaults to **/* matching any supported file', () => {
			const tsconfig = makeTsconfig();
			expect(isFileIncluded(tsconfig, file('index.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, file('src/deep/nested/file.ts'))).toBe(true);
		});

		test('files specified but no include — only exact files entries match', () => {
			const tsconfig = makeTsconfig({ files: ['src/main.ts'] });
			expect(isFileIncluded(tsconfig, file('src/main.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, file('src/other.ts'))).toBe(false);
		});

		test('both files and include — both sources contribute matches', () => {
			const tsconfig = makeTsconfig({
				files: ['extra.ts'],
				include: ['src/**/*'],
			});
			expect(isFileIncluded(tsconfig, file('extra.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, file('src/index.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, file('lib/index.ts'))).toBe(false);
		});
	});

	describe('include patterns', () => {
		test('src/**/* matches files in src and nested directories', () => {
			const tsconfig = makeTsconfig({ include: ['src/**/*'] });
			expect(isFileIncluded(tsconfig, file('src/index.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, file('src/deep/nested/file.ts'))).toBe(true);
		});

		test('src (no glob) becomes src/**/*', () => {
			const tsconfig = makeTsconfig({ include: ['src'] });
			expect(isFileIncluded(tsconfig, file('src/index.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, file('src/deep/nested/file.ts'))).toBe(true);
		});

		test('src/* matches src/index.ts but NOT src/nested/file.ts', () => {
			const tsconfig = makeTsconfig({ include: ['src/*'] });
			expect(isFileIncluded(tsconfig, file('src/index.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, file('src/nested/file.ts'))).toBe(false);
		});

		test('* matches files in root but not in subdirectories', () => {
			const tsconfig = makeTsconfig({ include: ['*'] });
			expect(isFileIncluded(tsconfig, file('index.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, file('src/index.ts'))).toBe(false);
		});

		test('? matches single character', () => {
			const tsconfig = makeTsconfig({ include: ['src/?.ts'] });
			expect(isFileIncluded(tsconfig, file('src/a.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, file('src/ab.ts'))).toBe(false);
		});
	});

	describe('exclude patterns', () => {
		test('excluded file returns false even if it matches include', () => {
			const tsconfig = makeTsconfig({
				include: ['src'],
				exclude: ['src/excluded.ts'],
			});
			expect(isFileIncluded(tsconfig, file('src/excluded.ts'))).toBe(false);
			expect(isFileIncluded(tsconfig, file('src/included.ts'))).toBe(true);
		});

		test('node_modules auto-excluded from **/ matching', () => {
			const tsconfig = makeTsconfig();
			expect(isFileIncluded(tsconfig, file('node_modules/pkg/index.ts'))).toBe(false);
		});

		test('bower_components auto-excluded from **/ matching', () => {
			const tsconfig = makeTsconfig();
			expect(isFileIncluded(tsconfig, file('bower_components/pkg/index.ts'))).toBe(false);
		});

		test('jspm_packages auto-excluded from **/ matching', () => {
			const tsconfig = makeTsconfig();
			expect(isFileIncluded(tsconfig, file('jspm_packages/pkg/index.ts'))).toBe(false);
		});
	});

	describe('default exclude (outDir/declarationDir)', () => {
		test('outDir auto-added to exclude when no explicit exclude', () => {
			const tsconfig = makeTsconfig({
				compilerOptions: { outDir: 'dist' },
			});
			expect(isFileIncluded(tsconfig, file('dist/index.ts'))).toBe(false);
			expect(isFileIncluded(tsconfig, file('src/index.ts'))).toBe(true);
		});

		test('declarationDir auto-added to exclude when no explicit exclude', () => {
			const tsconfig = makeTsconfig({
				compilerOptions: { declarationDir: 'types' },
			});
			expect(isFileIncluded(tsconfig, file('types/index.d.ts'))).toBe(false);
			expect(isFileIncluded(tsconfig, file('src/index.ts'))).toBe(true);
		});

		test('explicit exclude replaces default outDir/declarationDir exclude', () => {
			const tsconfig = makeTsconfig({
				compilerOptions: { outDir: 'dist' },
				exclude: [],
			});
			expect(isFileIncluded(tsconfig, file('dist/index.ts'))).toBe(true);
		});
	});

	describe('files field', () => {
		test('exact path match resolved relative to tsconfig dir', () => {
			const tsconfig = makeTsconfig({ files: ['src/main.ts'] });
			expect(isFileIncluded(tsconfig, file('src/main.ts'))).toBe(true);
		});

		test('files entry bypasses exclude', () => {
			const tsconfig = makeTsconfig({
				files: ['src/index.ts'],
				exclude: ['src'],
			});
			expect(isFileIncluded(tsconfig, file('src/index.ts'))).toBe(true);
		});

		test('files entry bypasses extension checks', () => {
			const tsconfig = makeTsconfig({ files: ['data.json'] });
			expect(isFileIncluded(tsconfig, file('data.json'))).toBe(true);
		});
	});

	describe('validation', () => {
		test('non-absolute file path returns false', () => {
			expect(isFileIncluded(makeTsconfig(), 'src/index.ts')).toBe(false);
		});

		test('config with unresolved extends throws', () => {
			const tsconfig: TsconfigResult = {
				config: {
					// @ts-expect-error testing unresolved extends
					extends: '../base.json',
				},
				path: `${projectDir}/tsconfig.json`,
			};
			expect(() => isFileIncluded(tsconfig, file('index.ts'))).toThrow(
				'tsconfig#extends must be resolved',
			);
		});

		test('non-absolute tsconfig path throws', () => {
			const tsconfig: TsconfigResult = {
				config: {},
				path: 'tsconfig.json',
			};
			expect(() => isFileIncluded(tsconfig, file('index.ts'))).toThrow(
				'The tsconfig path must be absolute',
			);
		});
	});

	describe('hidden files', () => {
		test('.dotfile.ts in root not matched by *', () => {
			const tsconfig = makeTsconfig({ include: ['*'] });
			expect(isFileIncluded(tsconfig, file('.dotfile.ts'))).toBe(false);
		});

		test('.hidden/file.ts not matched by **/', () => {
			const tsconfig = makeTsconfig();
			expect(isFileIncluded(tsconfig, file('.hidden/file.ts'))).toBe(false);
		});

		test('explicitly included hidden directory with glob works', () => {
			const tsconfig = makeTsconfig({ include: ['.hidden/*'] });
			expect(isFileIncluded(tsconfig, file('.hidden/file.ts'))).toBe(true);
		});
	});

	describe('edge cases', () => {
		test('file outside project directory returns false', () => {
			const otherDir = isWindows ? 'C:/other' : '/other';
			expect(isFileIncluded(makeTsconfig(), `${otherDir}/index.ts`)).toBe(false);
		});

		test('file path that equals the project directory returns false', () => {
			expect(isFileIncluded(makeTsconfig(), projectDir)).toBe(false);
		});

		test('very deeply nested file with **/ pattern', () => {
			const tsconfig = makeTsconfig({ include: ['src'] });
			expect(isFileIncluded(tsconfig, file('src/a/b/c/d/e/f/g/h/i.ts'))).toBe(true);
		});

		test('empty include array matches nothing', () => {
			const tsconfig = makeTsconfig({ include: [] });
			expect(isFileIncluded(tsconfig, file('index.ts'))).toBe(false);
		});
	});

	describe('caching', () => {
		test('same tsconfig object returns consistent results for different files', () => {
			const tsconfig = makeTsconfig({ include: ['src'] });
			expect(isFileIncluded(tsconfig, file('src/a.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, file('src/b.ts'))).toBe(true);
			expect(isFileIncluded(tsconfig, file('lib/c.ts'))).toBe(false);
		});

		test('different tsconfig objects have separate compilations', () => {
			const tsconfigA = makeTsconfig({ include: ['src'] });
			const tsconfigB = makeTsconfig({ include: ['lib'] });
			expect(isFileIncluded(tsconfigA, file('src/index.ts'))).toBe(true);
			expect(isFileIncluded(tsconfigA, file('lib/index.ts'))).toBe(false);
			expect(isFileIncluded(tsconfigB, file('lib/index.ts'))).toBe(true);
			expect(isFileIncluded(tsconfigB, file('src/index.ts'))).toBe(false);
		});
	});

	describe('additional edge cases', () => {
		test('include with empty string pattern', () => {
			const tsconfig = makeTsconfig({ include: [''] });
			expect(isFileIncluded(tsconfig, file('index.ts'))).toBe(true);
		});

		test('file with no extension returns false', () => {
			expect(isFileIncluded(makeTsconfig(), file('Makefile'))).toBe(false);
		});

		test('tsconfig.json path itself returns false', () => {
			expect(isFileIncluded(makeTsconfig(), file('tsconfig.json'))).toBe(false);
		});
	});
});
