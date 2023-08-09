import { parse } from 'jsonc-parser';
import { readFile } from './fs-cached.js';

export const readJsonc = (
	jsonPath: string,
	cache?: Map<string, any>,
) => parse(readFile(cache, jsonPath, 'utf8') as string) as unknown;
