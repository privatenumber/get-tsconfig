import fs from 'fs';
import { parse } from 'jsonc-parser';

export const readJsonc = <T>(
	jsonPath: string,
	api: Pick<typeof fs, 'readFileSync'> = fs,
): T | undefined => {
	const parsed = parse(api.readFileSync(jsonPath, 'utf8'));
	if (parsed && typeof parsed === 'object') {
		return parsed;
	}
};
