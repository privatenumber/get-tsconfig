# Configuration discovery

Source snapshot: TypeScript 6.0.3 at
[`050880ce59e30b356b686bd3144efe24f875ebc8`](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/package.json#L1-L7).

## Ancestor search

`findConfigFile` still probes the starting directory and each ancestor for `tsconfig.json`, stopping
at and including the filesystem root. It returns the nearest candidate accepted by `fileExists`
([`findConfigFile`](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/program.ts#L328-L333)).
The function itself does not parse candidates or test source-file membership.

## No-input invocation

With no explicit source files and no `--project`, `tsc` performs the ancestor search and parses the
nearest config. An explicit `--project` continues to select its directory's `tsconfig.json` or the
exact path supplied
([CLI config selection](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/executeCommandLine.ts#L624-L654)).

## Explicit source files

With explicit files, no `--project`, and no `--ignoreConfig`, the CLI searches upward from
`sys.getCurrentDirectory()`. If it finds a config, it emits TS5112; otherwise compilation proceeds
config-free
([CLI branch](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/executeCommandLine.ts#L624-L654)).

`--ignoreConfig` skips this search
([option declaration](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L691-L699),
[CLI use](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/executeCommandLine.ts#L624-L654)).

## Language-service project selection

The language service checks `tsconfig.json` before `jsconfig.json` while walking upward from the
file. A containing project root limits that walk; a search originating under `node_modules` stops
after checking the `node_modules` directory
([config locations](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/server/editorServices.ts#L2576-L2635)).

Configured-project applicability remains root-list-first. A supported source file absent from the
parsed root list is rejected; direct `files` and include/exclude fallback matching is reserved for
otherwise unsupported file kinds
([applicability](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/server/editorServices.ts#L4491-L4531)).

Because omitted compiler options now make JSON modules effective, JSON files use the supported-file
root-list path instead of the unsupported-file fallback
([supported extension classification](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L10145-L10155),
[JSON default](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9173-L9188)).
