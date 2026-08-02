# Compiler option defaults

Source snapshot: TypeScript 6.0.3 at
[`050880ce59e30b356b686bd3144efe24f875ebc8`](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/package.json#L1-L7).

## Representation boundary

An ordinary configuration still starts with an empty options object and copies only supplied JSON
properties into it
([`parseOwnConfigOfJsonSourceFile`](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L3567-L3614)).
The defaults below are mostly lazy effective values, not materialized properties.

`--showConfig` enumerates stored properties and adds computed options only when they transitively
depend on a provided option and differ from their computation on an empty object
([serialization](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L2686-L2710),
[property conversion](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L2769-L2826)).
An empty config therefore still prints an empty `compilerOptions` object
([baseline](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/tests/baselines/reference/config/showConfig/Default%20initialized%20TSConfig/tsconfig.json#L1-L3)).

The `tsc --init` template explicitly writes NodeNext and ESNext, so it does not display the
compiler's omitted-option defaults
([generated config](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/tests/baselines/reference/config/initTSConfig/Default%20initialized%20TSConfig/tsconfig.json#L1-L43)).

## Headline defaults

| Effective setting | TypeScript 6.0.3 behavior |
| --- | --- |
| `target` | [`LatestStandard`, aliased to ES2025](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/types.ts#L7671-L7690) |
| `module` | [ES2022, derived from ES2025 target](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9055-L9075) |
| `moduleResolution` | [Bundler, derived from ES2022 module](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9077-L9097) |
| `strict` family | [Enabled unless `strict` or an individual child is explicitly false](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9228-L9281) |
| `rootDir` effect | [Config directory for a config-file project](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/emitter.ts#L635-L656) |
| automatic `types` | [None unless `"*"` is explicitly present](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/moduleNameResolver.ts#L805-L850) |
| `noUncheckedSideEffectImports` | [Enabled unless explicitly false](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/checker.ts#L1528-L1545) |
| `libReplacement` | [Disabled unless explicitly true](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/program.ts#L3835-L3848) |

## Target, module, and resolution

Target no longer depends on module. An explicit target other than deprecated ES3 wins. An omitted
or ES3 target computes to `LatestStandard`, whose enum alias is ES2025
([target computation](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9048-L9053),
[enum alias](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/types.ts#L7671-L7690)).
In particular, `module: nodenext` no longer raises an omitted target to ESNext.

An omitted module is selected from the effective target. ESNext maps to ESNext, ES2022 through
ES2025 map to ES2022, ES2020 and ES2021 map to ES2020, ES2015 through ES2019 map to ES2015, and
older targets map to CommonJS
([module computation](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9055-L9075)).

An omitted module resolution is Classic for the deprecated None, AMD, UMD, and System module
kinds; NodeNext for NodeNext; Node16 for Node16, Node18, and Node20; and Bundler for every other
module kind
([module-resolution computation](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9077-L9097)).
The empty-option chain is therefore ES2025, ES2022, and Bundler.

Those defaults enable ES2025's default library
([library mapping](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilitiesPublic.ts#L312-L345)),
class-field define semantics
([`useDefineForClassFields`](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9220-L9226)),
package exports and imports
([package map defaults](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9135-L9171)),
and JSON modules
([`resolveJsonModule`](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9173-L9188)).
Interop and synthetic default imports independently default to true
([interop defaults](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9117-L9133)).

## Strict family

An absent strict-family child uses its explicit value when present and otherwise evaluates
`compilerOptions.strict !== false`
([`getStrictOptionValue`](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9368-L9371)).
This enables `noImplicitAny`, `noImplicitThis`, `strictNullChecks`, `strictFunctionTypes`,
`strictBindCallApply`, `strictPropertyInitialization`, `strictBuiltinIteratorReturn`, and
`useUnknownInCatchVariables` by default
([computed strict options](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9228-L9281)).

`alwaysStrict` is no longer a strict-family child. It independently defaults true unless explicitly
false, so `strict: false` alone does not restore the earlier `alwaysStrict` default
([`alwaysStrict` computation](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9270-L9275),
[exported getter](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9319-L9323)).

## Config-file root directory

TypeScript does not store a synthetic `rootDir: "."` property. Instead, the lazy common-source-
directory rule uses the config directory whenever `configFilePath` is present
([emit root computation](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/emitter.ts#L635-L656)).

The output-path test demonstrates the consequence: an omitted `rootDir` preserves the source
directory beneath `outDir`, and the compiler diagnoses inputs outside the config directory
([test](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/testRunner/unittests/tsbuild/outputPaths.ts#L49-L76),
[baseline and diagnostic](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/tests/baselines/reference/tsbuild/outputPaths/when-rootDir-is-not-specified.js#L28-L55)).

## Automatic type packages

When `types` is absent, TypeScript 6.0.3 returns no automatic type directive names. An explicit
`"*"` entry triggers enumeration of visible `@types` packages and can coexist with named entries
([`getAutomaticTypeDirectiveNames`](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/moduleNameResolver.ts#L805-L850),
[wildcard predicate](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/utilities.ts#L9021-L9027)).

## Side-effect imports

`noUncheckedSideEffectImports` is effective unless explicitly false
([option declaration](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L1273-L1281),
[checker initialization](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/checker.ts#L1528-L1545)).
The checker reports unresolved imports that have no import clause when this option is effective
([side-effect import resolution](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/checker.ts#L48693-L48700)).

## Library replacement

`libReplacement` defaults false. The compiler attempts `@typescript/lib-*` replacement only when
the option is truthy
([option declaration](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/commandLineParser.ts#L895-L902),
[runtime branch](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/src/compiler/program.ts#L3835-L3848)).
