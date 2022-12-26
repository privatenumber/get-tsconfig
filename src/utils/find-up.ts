import path from 'path';
import fs from 'fs';
import slash from 'slash';

type FsAPI = Pick<typeof fs, 'existsSync'>;

function findUp(
	searchPath: string,
	fileName: string,
	findAll?: false,
	api?: FsAPI,
): string | undefined;

function findUp(
	searchPath: string,
	fileName: string,
	findAll: boolean,
	api?: FsAPI,
): string[];

function findUp(
	searchPath: string,
	fileName: string,
	findAll?: boolean,
	api: FsAPI = fs,
) {
	const foundPaths: string[] = [];

	while (true) {
		const configPath = path.join(searchPath, fileName);

		if (api.existsSync(configPath)) {
			const foundPath = slash(configPath);

			if (findAll) {
				foundPaths.push(foundPath);
			} else {
				return foundPath;
			}
		}

		const parentPath = path.dirname(searchPath);
		if (parentPath === searchPath) {
			break;
		}

		searchPath = parentPath;
	}

	return findAll ? foundPaths : undefined;
}

export { findUp };
