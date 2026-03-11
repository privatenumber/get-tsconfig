import fs from 'node:fs';
import type { Cache } from '../types.js';

type Fs = typeof fs;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

type FunctionProperties<Type> = {
	[Key in keyof Type as Type[Key] extends AnyFunction ? Key : never]: Type[Key];
};

type FsMethods = FunctionProperties<Fs>;

const cacheFs = <MethodName extends keyof FsMethods>(
	name: MethodName,
) => {
	const method = fs[name];
	type FsReturnType = ReturnType<FsMethods[MethodName]>;

	return (
		cache?: Cache,
		...args: any[]
	): FsReturnType => {
		const cacheKey = `${name}:${args.join(':')}`;
		let result = cache?.get(cacheKey) as FsReturnType;

		if (result === undefined) {
			result = Reflect.apply(method, fs, args);
			cache?.set(cacheKey, result);
		}

		return result;
	};
};

export const readFile = cacheFs('readFileSync');

/**
 * Cached stat that returns undefined on ENOENT instead of throwing.
 * Replaces exists() + stat() pairs with a single syscall.
 */
export const tryStat = (
	cache: Cache | undefined,
	filePath: string,
): fs.Stats | undefined => {
	const cacheKey = `tryStat:${filePath}`;
	let result = cache?.get(cacheKey) as fs.Stats | null | undefined;

	if (result === undefined) {
		try {
			result = fs.statSync(filePath);
		} catch {
			result = null;
		}
		cache?.set(cacheKey, result);
	}

	return result ?? undefined;
};
