# TypeScript 6.0.3

This sparse snapshot is pinned to TypeScript 6.0.3 at
[`050880ce59e30b356b686bd3144efe24f875ebc8`](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/package.json#L1-L7).

## Audited topics

| Topic | Note |
| --- | --- |
| Effective compiler defaults and their lazy computation | [Compiler option defaults](./compiler-option-defaults.md) |
| Configuration pipeline | [5.9.3 baseline](../v5.9.3/configuration-pipeline.md), reverified below |
| JSONC parsing and diagnostics | [5.9.3 baseline](../v5.9.3/jsonc-parsing-and-diagnostics.md), reverified below |
| Configuration discovery | [6.0.3 replacement](./configuration-discovery.md) |
| `extends` target resolution | [5.9.3 baseline](../v5.9.3/extends-resolution.md), isolated changes below |
| `extends` inheritance | [5.9.3 baseline](../v5.9.3/extends-inheritance.md), reverified below |
| Config-relative path ownership | [5.9.3 baseline](../v5.9.3/config-relative-paths.md), reverified below |
| Root-file selection algorithm | [5.9.3 baseline](../v5.9.3/root-file-selection.md), reverified below |
| Wildcard matching algorithm | [5.9.3 baseline](../v5.9.3/wildcard-matching.md), reverified below |
| `paths` and `baseUrl` matching | [5.9.3 baseline](../v5.9.3/paths-and-baseurl.md), reverified below |

## Configuration pipeline

The object and source-file APIs still converge on one worker. It parses inheritance, overlays
existing options, substitutes `${configDir}`, enumerates files and references, and returns
the same categories of parsing diagnostics as 5.9.3
([entry points](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3013-L3028),
[worker](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3059-L3107)).

## JSONC and diagnostics

`readConfigFile` still returns a recovered object and only the first diagnostic through its
singular error field, while the full pipeline combines source parse diagnostics with config
conversion diagnostics
([reader](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L2267-L2292),
[diagnostic aggregation](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/program.ts#L1323-L1326)).
The JSON parser continues to skip comments as trivia and accept trailing commas
([JSON parser](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/parser.ts#L1646-L1690),
[comma handling](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/parser.ts#L3490-L3558)).

## `extends` target resolution

Path-like requests remain config-relative and try an optional `.json` suffix, while bare requests
still use the dedicated NodeNext JSON resolver
([config target resolution](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3646-L3677),
[NodeNext JSON resolver](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/moduleNameResolver.ts#L1798-L1801)).

Two package-resolution edges changed. The NodeNext config resolver recognizes `#/` package-import
requests. A `null` target reached within an imports/exports map returns terminal
`{ value: undefined }`, stopping conditional or array fallback. This does not apply to a top-level
falsy `imports` or `exports` field
([`#/` support](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/moduleNameResolver.ts#L1690-L1707),
[`null` target](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/moduleNameResolver.ts#L2855-L2859)).

## `extends` inheritance

Multiple bases still apply left to right, later bases replace earlier properties, and the child
replaces all bases. File specifications inherit when the child value is absent or `null`; an own
array, including `[]`, blocks inheritance. Inherited specifications are rebased to preserve their
declaring config. Circularity, extended-config caching, and non-inheritance of references are also
unchanged
([merge and precedence](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3405-L3493),
[recursive loading and cache](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3685-L3722)).

## Config-relative paths

Explicit path options remain owned by the config that declares them, `pathsBasePath` retains path
mapping ownership, and inherited file specifications are rebased. Prefix-only `${configDir}` still
survives inheritance and resolves against the worker's `basePath`, which is the leaf config
directory for standard file-loading callers
([ownership and rebasing](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3427-L3472),
[path normalization](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3801-L3843),
[template substitution](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3252-L3315)).
The omitted-`rootDir` effective default changed and is documented in
[compiler option defaults](./compiler-option-defaults.md#config-file-root-directory).

## Root-file selection

Literal `files` remain unconditional, `exclude` still affects only wildcard discovery, and include
discovery retains extension filtering and extension-priority deduplication
([selection algorithm](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3928-L4014)).
The default `**/*` include and synthesized `outDir`/`declarationDir` exclusions are also unchanged
([spec defaults](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3109-L3196)).

Effective `allowJs` still uses an explicit value when present and otherwise follows `checkJs`;
`jsconfig.json` still stores `allowJs: true`
([computation](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9214-L9218),
[`jsconfig` preset](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3745-L3749)).

The ambient default changed because Bundler resolution makes `resolveJsonModule` effective. JSON
files become extension-eligible, but they still require an explicit include ending in `.json`;
default `**/*` does not select them
([default dependency chain](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9048-L9097),
[JSON default](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9173-L9188),
[root filtering](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3969-L3987)).

## Wildcard matching

Implicit directory globs, hidden-path and package-directory suppression, include/exclude regex
construction, sorted traversal, exclusion pruning, and first-matching-include ordering retain the
5.9.3 algorithm
([pattern construction](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9607-L9777),
[filesystem traversal](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9802-L9887)).

## `paths` and `baseUrl`

`paths` is attempted when `pathIsRelative(moduleName)` is false, so rooted paths are eligible. It
runs before `baseUrl`, and its base is `baseUrl`, then `pathsBasePath`, then
`host.getCurrentDirectory()` for API-provided options
([resolution order](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/moduleNameResolver.ts#L1555-L1580),
[inherited origin](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3427-L3432)).
Exact keys still precede wildcard keys, wildcard selection still uses the longest prefix, and
substitutions still run in declaration order
([key matching](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L10317-L10336),
[substitution loop](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/moduleNameResolver.ts#L3169-L3195)).

The matching algorithm is unchanged. When both `module` and `moduleResolution` are omitted, 5.9.3
yields CommonJS/Node10 while 6.0.3 yields ES2022/Bundler. An omitted `moduleResolution` still derives
from effective `module`, so the downstream loader can probe a generated candidate differently
([5.9.3 module and resolution defaults](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L8981-L9016),
[6.0.3 resolution default](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9077-L9097)).

## Language-service consequence

Configured-project applicability remains root-list-first: supported files absent from parsed roots
are rejected, while direct file/include fallback matching is reserved for unsupported file kinds
([applicability](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/server/editorServices.ts#L4491-L4531)).
Because JSON is supported under the new defaults, JSON files now follow the root-list path rather
than the unsupported-file fallback
([supported-file classification](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L10145-L10155)).

Other topics are not assumed to match 5.9.3. They remain marked as unaudited until their source and
tests have been checked at this snapshot.
