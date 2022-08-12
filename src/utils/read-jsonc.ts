import fs from 'fs';
import { parse } from 'jsonc-parser';

export function readJsonc(
	jsonPath: string,
) {
	const packageJsonString = fs.readFileSync(jsonPath, 'utf8');
	return parse(packageJsonString);
}
