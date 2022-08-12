import fs from 'fs';
import { parse } from 'jsonc-parser';

export const readJsonc = (
	jsonPath: string,
	api: Pick<typeof fs, 'readFileSync'> = fs,
) => parse(api.readFileSync(jsonPath, 'utf8'));
