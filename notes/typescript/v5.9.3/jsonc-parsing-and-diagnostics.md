# JSONC parsing and diagnostics

Source snapshot: TypeScript 5.9.3 at
[`c63de15a992d37f0d6cec03ac7631872838602cb`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/package.json#L1-L6).

## Reading API

`readConfigFile` delegates to `tryReadFile`. A thrown reader error and an `undefined` read result
produce different `Cannot read file` diagnostics, but both return an empty config with an error
instead of throwing
([reader wrapper](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2233-L2236),
[`tryReadFile`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2260-L2270)).

On a successful read, `parseConfigFileTextToJson` parses an AST, converts it to an object, and
returns only the first diagnostic in its singular `error` field. Valid recovered properties can
still be present in `config`
([text conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2243-L2249)).

## JSONC grammar

`parseJsonText` parses in `ScriptKind.JSON`, accepts scalar, array, or object roots at the syntax
level, consumes all top-level input, and can synthesize an array around multiple recovered
top-level expressions. Diagnostics remain attached to the source file
([JSON parser](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/parser.ts#L1646-L1732)).

Line and block comments are trivia and disappear from the converted object. Tests cover comments
before properties, inside arrays, and before values
([test cases](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/tsconfigParsing.ts#L69-L111),
[converted baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/tsconfigParsing/returns%20config%20object%20without%20comments%20jsonParse.js#L1-L33)).

Arrays and objects share the comma-delimited parser. A comma immediately before the closing token
is retained as a trailing comma without an expected-comma diagnostic
([comma-list parser](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/parser.ts#L3489-L3518),
[array trailing comma](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/parser.ts#L6689-L6697),
[object trailing comma](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/parser.ts#L6755-L6763)).

## Object conversion and recovery

Config conversion ultimately requires an object. If syntax recovery produced a top-level array,
the converter attempts to recover the first object element; otherwise it produces an empty object
([root recovery](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2403-L2428)).

Values may be strings, numbers, negative numbers, booleans, `null`, objects, or arrays. Invalid
property forms and non-double-quoted strings produce diagnostics while valid neighboring values
continue to convert
([value conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2457-L2556)).

Recovery is observable: the missing-comma test preserves both valid properties and reports both
syntax diagnostics
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/tsconfigParsing.ts#L253-L268),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/tsconfigParsing/parse%20and%20re-emit%20tsconfig.json%20file%20with%20diagnostics.js#L1-L28)).

## Diagnostic channels

Root syntax diagnostics remain on `options.configFile`; `getConfigFileParsingDiagnostics` combines
them with semantic and conversion diagnostics
([source-file diagnostics](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2997-L3002),
[program aggregation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/program.ts#L1323-L1327)).

Extended configs use a stricter recursion boundary. When an extended source file has parse
diagnostics, TypeScript skips its semantic config parse and appends all of its parse diagnostics to
the consuming result
([extended-config parse](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3651-L3688)).
