import type { TsConfigJson, PackageJson } from 'type-fest';

export const createTsconfigJson = (
	tsconfig: TsConfigJson,
) => JSON.stringify(tsconfig);

export const createPackageJson = (
	packageJson: PackageJson,
) => JSON.stringify(packageJson);
