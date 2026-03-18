import type { TsconfigJson } from '../types.js';

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
		let target = compilerOptions.target.toLowerCase() as TsconfigJson.CompilerOptions.Target;

		if (target === 'es2015') {
			target = 'es6';
		}

		// Lower case
		compilerOptions.target = target;

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
		) {
			compilerOptions.module ??= 'es6';
		}

		if (
			target === 'es2022'
			|| target === 'es2023'
			|| target === 'es2024'
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

		if (module === 'node16') {
			compilerOptions.target ??= 'es2022';
			compilerOptions.moduleResolution ??= 'node16';
		}

		if (module === 'node18') {
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

	if (compilerOptions.jsx) {
		compilerOptions.jsx = compilerOptions.jsx.toLowerCase() as TsconfigJson.CompilerOptions.JSX;
	}

	if (compilerOptions.moduleDetection) {
		compilerOptions.moduleDetection = compilerOptions.moduleDetection.toLowerCase() as
			TsconfigJson.CompilerOptions.ModuleDetection;
	}

	if (compilerOptions.importsNotUsedAsValues) {
		compilerOptions.importsNotUsedAsValues = compilerOptions.importsNotUsedAsValues.toLowerCase() as
			TsconfigJson.CompilerOptions.ImportsNotUsedAsValues;
	}

	if (compilerOptions.newLine) {
		compilerOptions.newLine = compilerOptions.newLine.toLowerCase() as
			TsconfigJson.CompilerOptions.NewLine;
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
