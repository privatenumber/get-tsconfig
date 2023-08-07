import fs from 'fs';

type Fs = typeof fs;

type AnyFunction = (...args: any[]) => any;

type FunctionProperties<Type> = {
	[Key in keyof Type as Type[Key] extends AnyFunction ? Key : never]: Type[Key];
};

type FsMethods = FunctionProperties<Fs>;

const cacheFs = <MethodName extends keyof FsMethods>(
	name: MethodName,
) => {
	const method = fs[name];
	return function (
		cache?: Map<string, any>,
		...args: any[]
	): ReturnType<FsMethods[MethodName]> {
		const cacheKey = `${name}:${args.join(':')}`;
		let result = cache?.get(cacheKey);

		if (result === undefined) {
			result = Reflect.apply(method, fs, args);
			cache?.set(cacheKey, result);
		}

		return result;
	};
};

export const exists = cacheFs('existsSync');
export const realpath = cacheFs('realpathSync');
export const readFile = cacheFs('readFileSync');
export const stat = cacheFs('statSync');
