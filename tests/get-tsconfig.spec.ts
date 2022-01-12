import AggregateError from 'aggregate-error';
import getTsconfig from '../src';

test('error: invalid path', () => {
	expect(() => getTsconfig('/')).toThrow('Could not find a tsconfig.json file.');
});

test('error: invalid json path', () => {
	expect(() => getTsconfig('.json')).toThrow('Cannot read file \'.json\'.');
});

test('error: invalid tsconfig.json', () => {
	try {
		getTsconfig('./tests/fixtures/tsconfig.invalid.json');
	} catch (error) {
		expect(error).toBeInstanceOf(AggregateError);

		if (error instanceof AggregateError) {
			const errorsArray = Array.from(error);
			expect(errorsArray[0].message).toBe('Compiler option \'strict\' requires a value of type boolean.');
			expect(errorsArray[1].message).toMatch('Argument for \'--jsx\' option must be: \'preserve\', \'react-native\', \'react\'');
		}
	}
});

test('get tsconfig from cwd', () => {
	const tsconfig = getTsconfig();

	expect(tsconfig).toMatchObject({
		compilerOptions: {
			moduleResolution: 2,
			isolatedModules: true,
			esModuleInterop: true,
			declaration: true,
			strict: true,
			module: 1,
			target: 6,
			configFilePath: undefined,
		},
	});
});

test('get tsconfig from directory path', () => {
	const tsconfig = getTsconfig('./tests/fixtures');

	expect(tsconfig).toMatchObject({
		compilerOptions: {
			strict: true,
			jsx: 2,
			jsxFactory: 'h',
			configFilePath: undefined,
		},
	});
});

test('get tsconfig from tsconfig.json path', () => {
	const tsconfig = getTsconfig('./tests/fixtures/tsconfig.json');

	expect(tsconfig).toMatchObject({
		compilerOptions: {
			strict: true,
			jsx: 2,
			jsxFactory: 'h',
			configFilePath: undefined,
		},
	});
});

test('get tsconfig from index.js path', () => {
	const tsconfig = getTsconfig('./tests/fixtures/index.js');

	expect(tsconfig).toMatchObject({
		compilerOptions: {
			strict: true,
			jsx: 2,
			jsxFactory: 'h',
			configFilePath: undefined,
		},
	});
});
