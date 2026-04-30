import type { TsconfigJson } from './types.js';

// type-fest does not yet model 'es2025'; widen the union locally so the
// es2025 comparisons below typecheck.
//
// `es2025` was added to the derivation switches alongside the v6
// version-defaults work — TS 6.0 defaults `target: es2025` (LatestStandard),
// and without these branches the synthesized target would not cascade into
// `module ??= 'es6'` or `useDefineForClassFields ??= true`. The change is
// observable for any consumer with an explicit `target: 'es2025'` even
// without `typescriptVersion` set: they now see the synthesized `module`/
// `moduleResolution`/`useDefineForClassFields` they didn't before. This
// aligns with TS itself, but is a behaviour change worth knowing about.
type Target = TsconfigJson.CompilerOptions.Target | 'es2025';

export const normalizeCompilerOptions = (
	input: TsconfigJson.CompilerOptions,
): TsconfigJson.CompilerOptions => {
	const compilerOptions = { ...input };

	if (compilerOptions.strict) {
		const strictOptions = [
			'noImplicitAny',
			'noImplicitThis',
			'strictNullChecks',
			'strictFunctionTypes',
			'strictBindCallApply',
			'strictPropertyInitialization',
			'strictBuiltinIteratorReturn',
			'alwaysStrict',
			'useUnknownInCatchVariables',
		] as const;

		for (const key of strictOptions) {
			if (compilerOptions[key] === undefined) {
				compilerOptions[key] = true;
			}
		}
	}

	if (compilerOptions.composite) {
		compilerOptions.declaration ??= true;
		compilerOptions.incremental ??= true;
	}

	if (compilerOptions.target) {
		let target = compilerOptions.target.toLowerCase() as Target;

		if (target === 'es2015') {
			target = 'es6';
		}

		compilerOptions.target = target as TsconfigJson.CompilerOptions.Target;

		if (target === 'esnext') {
			compilerOptions.module ??= 'es6';
			compilerOptions.useDefineForClassFields ??= true;
		}

		if (
			target === 'es6'
			|| target === 'es2016'
			|| target === 'es2017'
			|| target === 'es2018'
			|| target === 'es2019'
			|| target === 'es2020'
			|| target === 'es2021'
			|| target === 'es2022'
			|| target === 'es2023'
			|| target === 'es2024'
			|| target === 'es2025'
		) {
			compilerOptions.module ??= 'es6';
		}

		if (
			target === 'es2022'
			|| target === 'es2023'
			|| target === 'es2024'
			|| target === 'es2025'
		) {
			compilerOptions.useDefineForClassFields ??= true;
		}
	}

	if (compilerOptions.module) {
		let module = compilerOptions.module.toLowerCase() as TsconfigJson.CompilerOptions.Module;

		if (module === 'es2015') {
			module = 'es6';
		}

		compilerOptions.module = module;

		if (
			module === 'es6'
			|| module === 'es2020'
			|| module === 'es2022'
			|| module === 'esnext'
			|| module === 'none'
			|| module === 'system'
			|| module === 'umd'
			|| module === 'amd'
		) {
			compilerOptions.moduleResolution ??= 'classic';
		}

		if (module === 'system') {
			compilerOptions.allowSyntheticDefaultImports ??= true;
		}

		if (
			module === 'node16'
			|| module === 'node18'
			|| module === 'node20'
			|| module === 'nodenext'
			|| module === 'preserve'
		) {
			compilerOptions.esModuleInterop ??= true;
			compilerOptions.allowSyntheticDefaultImports ??= true;
		}

		if (
			module === 'node16'
			|| module === 'node18'
			|| module === 'node20'
			|| module === 'nodenext'
		) {
			compilerOptions.moduleDetection ??= 'force';
		}

		if (module === 'node16' || module === 'node18') {
			compilerOptions.target ??= 'es2022';
			compilerOptions.moduleResolution ??= 'node16';
		}

		if (module === 'node20') {
			compilerOptions.target ??= 'es2023';
			compilerOptions.moduleResolution ??= 'node16';
			compilerOptions.resolveJsonModule ??= true;
		}

		if (module === 'nodenext') {
			compilerOptions.target ??= 'esnext';
			compilerOptions.moduleResolution ??= 'nodenext';
			compilerOptions.resolveJsonModule ??= true;
		}

		// useDefineForClassFields is implied when effective target >= ES2022
		// TypeScript treats es3 as "not set", falling through to module's default target
		if (
			module === 'node16'
			|| module === 'node18'
			|| module === 'node20'
			|| module === 'nodenext'
		) {
			const effectiveTarget = compilerOptions.target;
			if (
				effectiveTarget === 'es3'
				|| effectiveTarget === 'es2022'
				|| effectiveTarget === 'es2023'
				|| effectiveTarget === 'es2024'
				|| effectiveTarget === 'esnext'
			) {
				compilerOptions.useDefineForClassFields ??= true;
			}
		}

		if (module === 'preserve') {
			compilerOptions.moduleResolution ??= 'bundler';
		}
	}

	if (compilerOptions.moduleResolution) {
		let moduleResolution = compilerOptions.moduleResolution.toLowerCase() as
				TsconfigJson.CompilerOptions.ModuleResolution;

		if (moduleResolution === 'node') {
			moduleResolution = 'node10';
		}

		compilerOptions.moduleResolution = moduleResolution;

		if (
			moduleResolution === 'node16'
			|| moduleResolution === 'nodenext'
			|| moduleResolution === 'bundler'
		) {
			compilerOptions.resolvePackageJsonExports ??= true;
			compilerOptions.resolvePackageJsonImports ??= true;
		}

		if (moduleResolution === 'bundler') {
			compilerOptions.allowSyntheticDefaultImports ??= true;
			compilerOptions.resolveJsonModule ??= true;
		}
	}

	for (const field of ['jsx', 'moduleDetection', 'importsNotUsedAsValues', 'newLine'] as const) {
		if (compilerOptions[field]) {
			(compilerOptions as Record<string, string>)[field] = compilerOptions[field]!.toLowerCase();
		}
	}

	if (compilerOptions.esModuleInterop) {
		compilerOptions.allowSyntheticDefaultImports ??= true;
	}

	if (compilerOptions.verbatimModuleSyntax) {
		compilerOptions.isolatedModules ??= true;
		compilerOptions.preserveConstEnums ??= true;
	}

	if (compilerOptions.isolatedModules) {
		compilerOptions.preserveConstEnums ??= true;
	}

	if (compilerOptions.rewriteRelativeImportExtensions) {
		compilerOptions.allowImportingTsExtensions ??= true;
	}

	if (compilerOptions.lib) {
		compilerOptions.lib = compilerOptions.lib.map(
			library => library.toLowerCase() as TsconfigJson.CompilerOptions.Lib,
		);
	}

	if (compilerOptions.checkJs) {
		compilerOptions.allowJs ??= true;
	}

	return compilerOptions;
};
