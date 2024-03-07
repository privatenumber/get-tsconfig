import { parse } from 'jsonc-parser';
import type { Cache } from '../types.js';
import { readFile } from './fs-cached.js';

export const readJsonc = (
	jsonPath: string,
	cache?: Cache,
) => parse(readFile(cache, jsonPath, 'utf8') as string) as unknown;
