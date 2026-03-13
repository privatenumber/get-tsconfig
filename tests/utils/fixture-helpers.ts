import type { PackageJson } from 'type-fest';
import type { TsconfigJson } from '#get-tsconfig';

export const createTsconfigJson = (
	tsconfig: TsconfigJson,
) => JSON.stringify(tsconfig);

export const createPackageJson = (
	packageJson: PackageJson,
) => JSON.stringify(packageJson);
