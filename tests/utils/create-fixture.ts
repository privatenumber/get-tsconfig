import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { TsConfigJson } from 'type-fest';

type FileTree = { [path: string]: string | FileTree };

const temporaryDirectory = path.join(os.tmpdir(), 'get-tsconfig');

function flattenFileTree(
	fileTree: FileTree,
	pathPrefix: string,
) {
	const files: {
		path: string;
		content: string;
	}[] = [];

	for (const filePath in fileTree) {
		if (!Object.hasOwn(fileTree, filePath)) {
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
			await fs.mkdir(path.dirname(file.path), { recursive: true });
			await fs.writeFile(file.path, file.content);
		}),
	);

	return {
		path: fixturePath,
		cleanup() {
			return fs.rm(fixturePath, {
				recursive: true,
				force: true,
			});
		},
	};
}

export const tsconfigJson = (
	tsconfig: TsConfigJson,
) => JSON.stringify(
	tsconfig,
	null,
	'\t',
);
