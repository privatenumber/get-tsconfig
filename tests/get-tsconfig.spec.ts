import fs from 'fs';
import os from 'os';
import AggregateError from 'aggregate-error';
import getTsconfig from '../src/index';

const temporaryDirectory = os.tmpdir();
const emptyDirectoryPath = `${temporaryDirectory}/empty-directory`;

if (!fs.existsSync(emptyDirectoryPath)) {
	fs.mkdirSync(emptyDirectoryPath);
}

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

test('error: no source files', () => {
	try {
		getTsconfig('./tests/fixtures/tsconfig.no-source.json');
	} catch (error) {
		expect(error).toBeInstanceOf(Error);

		if (error instanceof Error) {
			expect(error.message).toBe(
				'No inputs were found in config file \'tsconfig.json\'. Specified \'include\' paths were \'["non-existent"]\' and \'exclude\' paths were \'[]\'.',
			);
		}
	}
});

test('no tsconfig found', () => {
	const tsconfig = getTsconfig(emptyDirectoryPath);

	expect(tsconfig.path).toBe(undefined);
	expect(tsconfig.getRaw()).toStrictEqual({
		compileOnSave: false,
		compilerOptions: {},
	});
});

test('get tsconfig from cwd', () => {
	const tsconfig = getTsconfig();

	expect(tsconfig.getRaw()).toMatchObject({
		compilerOptions: {
			moduleResolution: 'NodeJs',
			isolatedModules: true,
			esModuleInterop: true,
			declaration: true,
			strict: true,
		},
		include: ['src'],
	});
});

test('get tsconfig from directory path', () => {
	const tsconfig = getTsconfig('./tests/fixtures');

	expect(tsconfig.getRaw()).toMatchObject({
		compilerOptions: {
			strict: true,
			jsx: 'React',
			jsxFactory: 'h',
		},
	});
});

test('get tsconfig from tsconfig.json path', () => {
	const tsconfig = getTsconfig('./tests/fixtures/tsconfig.json');

	expect(tsconfig.getRaw()).toMatchObject({
		compilerOptions: {
			strict: true,
			jsx: 'React',
			jsxFactory: 'h',
		},
	});
});

test('get tsconfig from index.js path', () => {
	const tsconfig = getTsconfig('./tests/fixtures/index.js');

	expect(tsconfig.getRaw()).toMatchObject({
		compilerOptions: {
			strict: true,
			jsx: 'React',
			jsxFactory: 'h',
			target: 'ESNext',
		},
	});
});
