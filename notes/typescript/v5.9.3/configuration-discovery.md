# Configuration discovery

Source snapshot: TypeScript 5.9.3 at
[`c63de15a992d37f0d6cec03ac7631872838602cb`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/package.json#L1-L6).

## `findConfigFile`

`findConfigFile(searchPath, fileExists, configName = "tsconfig.json")` probes the starting
directory and then each parent. It returns the first candidate for which `fileExists` is true and
stops after probing the filesystem root
([`findConfigFile`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/program.ts#L328-L333),
[ancestor traversal](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/path.ts#L1085-L1110)).

The function does not parse a candidate or check whether a particular source file belongs to the
candidate's root set. Its contract is only upward filename discovery
([implementation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/program.ts#L328-L333)).

## `tsc` selection rules

`tsc` performs upward discovery only when neither source file names nor `--project` were supplied.
With `--project`, a directory argument means exactly `<directory>/tsconfig.json`; a non-directory
argument is treated as the exact config path. Neither form falls back to an ancestor search
([CLI selection](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/executeCommandLine.ts#L595-L620)).

If discovery fails, `--showConfig` reports the missing config. A normal no-input invocation follows
the version/help path instead
([missing-config handling](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/executeCommandLine.ts#L622-L630)).

## Language-service project selection

The language service parses configured projects with the same
`parseJsonSourceFileConfigFileContent` function and includes client-provided extra file extensions
([configured-project parse](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/server/editorServices.ts#L2967-L2986)).

For a supported source file, `isMatchedByConfig` accepts an exact parsed root and otherwise rejects
the config because normal root-file parsing has already decided that the file is absent
([supported-file check](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/server/editorServices.ts#L4486-L4500)).
For unsupported file names, `isMatchedByConfig` checks explicit `files`, requires a nonempty
`include`, applies exclusions, and tests the include regex. A supported mixed-content extension
follows the normal root-list path
([extra-extension check](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/server/editorServices.ts#L4502-L4525)).

An opened file explicitly excluded from a configured project is not silently inserted into that
project. The server test places it in an inferred project instead
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/tsserver/configuredProjects.ts#L407-L431),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/tsserver/configuredProjects/files-explicitly-excluded-in-config-file.js#L224-L251)).

Wildcard-directory metadata produced during config parsing is reused to watch for newly created or
removed matching roots
([parser output](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3067-L3071),
[server watcher setup](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/server/editorServices.ts#L3060-L3077)).
