# Configuration pipeline

Source snapshot: TypeScript 5.9.3 at
[`c63de15a992d37f0d6cec03ac7631872838602cb`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/package.json#L1-L6).

## End-to-end CLI path

When `tsc` receives neither input files nor `--project`, it searches for a config, creates one
extended-config cache, and calls `parseConfigFileWithSystem`
([CLI selection](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/executeCommandLine.ts#L595-L640),
[system wrapper](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/watch.ts#L214-L224)).

`parseConfigFileWithSystem` delegates to `getParsedCommandLineOfConfigFile`. That function reads a
JSON source file and calls `parseJsonSourceFileConfigFileContent`
([config-file entry point](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2194-L2226)).
The source-file API and the object API converge on the same worker
([object and source-file entry points](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2972-L2995)).

The worker performs these stages in order
([worker](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3025-L3073)):

1. Parse the root config and its `extends` graph.
2. Overlay API-provided compiler and watch options.
3. Substitute `${configDir}` placeholders against the worker's `basePath`, which is the config
   directory for standard file-loading callers.
4. Derive the validated `files`, `include`, and `exclude` specifications.
5. Enumerate root file names.
6. Resolve project references.
7. Return options, watch options, roots, references, raw config, wildcard metadata, and errors.

The effective base for files and references is the directory containing `configFileName`. When no
filename is supplied, the caller's `basePath` is used
([base selection](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3008-L3012),
[worker use](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3053-L3064)).

## Precedence of API-provided options

`existingOptions` and `existingWatchOptions` override values parsed from the config. The worker uses
`extend(existing, parsed)`, and `extend` copies its second argument before copying its first
([worker merge](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3040-L3052),
[`extend`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/core.ts#L1488-L1510)).

This overlay happens after inheritance but before `${configDir}` substitution, so API-provided
config-template values participate in the same final substitution pass
([merge and substitution order](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3040-L3057)).

## Four configuration representations

### JSON source file

The source-file path preserves syntax nodes and parse diagnostics. The root file is attached to
`options.configFile`, allowing later compiler stages to report config syntax alongside semantic
configuration diagnostics
([source attachment](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2997-L3002),
[diagnostic collection](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/program.ts#L1323-L1327)).

### Raw object

`ParsedCommandLine.raw` is a converted, partially inherited object, not a faithful source snapshot
or effective state. Inherited file specifications may be copied into it; options are normalized
separately; lazy defaults remain absent. `convertToTSConfig` serializes parsed options and
specifications, not `raw`
([returned raw and options](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3053-L3073),
[serialization algorithm](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2625-L2677)).

### Parsed command line

`ParsedCommandLine` carries `options`, optional `watchOptions`, `fileNames`, project references,
errors, raw JSON, wildcard directories, and config specifications. Root files are the output of
`getFileNamesFromConfigSpecs`, not the raw `include` strings
([worker result](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3053-L3073)).

### Effective compiler values

Parsed `CompilerOptions` properties are mostly optional, preserving whether a value was supplied
([type definition](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/types.ts#L7396-L7429),
[continued properties](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/types.ts#L7464-L7562)).
The checker, resolver, emitter, and builder obtain many effective values through a separate
`computedOptions` registry
([registry and exported getters](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L8950-L8962),
[getters](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9213-L9248)).

## `--showConfig` is not the effective state

`convertToTSConfig` serializes stored options first. It then adds a computed value only when the
option was not explicit, transitively depends on a provided key, and differs from its result on an
empty options object
([serialization algorithm](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2625-L2677)).

An empty config consequently serializes as an empty `compilerOptions` object even though lazy
getters produce target, module, resolution, and other defaults
([empty baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/showConfig/Default%20initialized%20TSConfig/tsconfig.json#L1-L3)).
Conversely, `module: nodenext` causes `--showConfig` to print transitively dependent target,
resolution, module detection, interop, package-map, JSON, and class-field values
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/showConfig.ts#L58-L60),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/showConfig/Show%20TSConfig%20with%20transitively%20implied%20options/tsconfig.json#L1-L14)).
