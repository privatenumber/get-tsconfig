import fs from 'fs';
import { parse } from 'jsonc-parser';

export function readJsonc(
	jsonPath: string,
	api: Pick<typeof fs, 'readFileSync'> = fs,
) {
	const packageJsonString = api.readFileSync(jsonPath, 'utf8');
	return parse(packageJsonString);
}
