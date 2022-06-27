import fs from 'fs';
import path from 'path';
import os from 'os';
import type { TsConfigJson } from 'type-fest';

type FileTree = { [path: string]: string | FileTree };

const temporaryDirectory = path.join(fs.realpathSync(os.tmpdir()), `get-tsconfig${Date.now()}`);

const { hasOwnProperty } = Object.prototype;
const hasOwn = (object: any, key: string) => hasOwnProperty.call(object, key);

function flattenFileTree(
	fileTree: FileTree,
	pathPrefix: string,
) {
	const files: {
		path: string;
		content: string;
	}[] = [];

	for (const filePath in fileTree) {
		if (!hasOwn(fileTree, filePath)) {
			continue;
		}

		const file = fileTree[filePath];
		if (typeof file === 'string') {
			files.push({
				path: path.join(pathPrefix, filePath),
				content: file,
			});
		} else {
			files.push(
				...flattenFileTree(file, path.join(pathPrefix, filePath)),
			);
		}
	}

	return files;
}

let id = 1;
export async function createFixture(
	fileTree: FileTree,
) {
	const fixturePath = path.join(temporaryDirectory, `fixture-${id}`);
	id += 1;

	const files = flattenFileTree(fileTree, fixturePath);

	await Promise.all(
		files.map(async (file) => {
			await fs.promises.mkdir(path.dirname(file.path), { recursive: true });
			await fs.promises.writeFile(file.path, file.content);
		}),
	);

	return {
		path: fixturePath,
		cleanup() {
			return fs.promises.rm(fixturePath, {
				recursive: true,
				force: true,
			});
		},
	};
}

export const createTsconfigJson = (
	tsconfig: TsConfigJson,
) => JSON.stringify(
	tsconfig,
	null,
	'\t',
);
