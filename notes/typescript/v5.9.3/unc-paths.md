# UNC paths

Source snapshot: TypeScript 5.9.3 at
[`c63de15a992d37f0d6cec03ac7631872838602cb`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/package.json#L1-L6).

## Path representation

TypeScript normalizes backslashes to forward slashes, so a Windows UNC path such as
`\\server\share` becomes `//server/share`
([normalization](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/path.ts#L526-L530)).

Its path parser recognizes doubled leading separators as a UNC root rather than a POSIX root
([root recognition](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/path.ts#L161-L177)).
`combinePaths` then appends a relative path with a directory separator; it does not use Node's
POSIX path join semantics that collapse the double slash
([combination](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/path.ts#L579-L592)).

The path unit tests cover slash normalization and classify both slash-separated and backslash-
separated UNC paths as rooted disk paths
([normalization test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/paths.ts#L4-L9),
[root tests](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/paths.ts#L10-L21),
[rooted-path tests](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/paths.ts#L80-L90)).

## Config file specifications

When a config file name is available, TypeScript derives the file-specification base path from its
directory through `getNormalizedAbsolutePath`, then normalizes that result
([base path](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3008-L3012),
[worker](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3053-L3055)).
Relative `files` entries are resolved with that same UNC-preserving absolute-path operation
([literal files](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3926-L3932),
[absolute-path normalization](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/path.ts#L627-L640)).

For `include` and `exclude`, TypeScript passes the base path and specifications to `readDirectory`
([directory scan](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3935-L3937)).
The system host delegates this work to `matchFiles`
([system host](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/sys.ts#L1881-L1884)).
That matcher normalizes the path, constructs include and exclude expressions from normalized path
components, and forms the candidate absolute paths with `combinePaths`
([pattern construction](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9631-L9710),
[matching and traversal](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9762-L9822)).

`files` therefore remains a literal-root path, while `include` and `exclude` use wildcard
discovery. Both paths preserve the UNC representation established for the config root.
