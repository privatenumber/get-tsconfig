import fs from 'fs';
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

export const exists = cacheFs('existsSync');
export const readFile = cacheFs('readFileSync');
export const stat = cacheFs('statSync');
