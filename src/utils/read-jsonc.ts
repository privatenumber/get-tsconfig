import fs from 'fs';
import { parse } from 'jsonc-parser';

export const readJsonc = (
	jsonPath: string,
) => parse(fs.readFileSync(jsonPath, 'utf8')) as unknown;
