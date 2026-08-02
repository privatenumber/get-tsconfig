# Compiler option values

Source snapshot: TypeScript 5.9.3 at
[`c63de15a992d37f0d6cec03ac7631872838602cb`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/package.json#L1-L6).

## JSON conversion

Compiler option property names in `tsconfig.json` are case-sensitive. JSON conversion builds a map
from canonical declarations and performs exact-key lookup without lowercasing input names
([declaration map](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2272-L2274),
[lookup](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2475-L2485),
[conversion entry](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3743-L3757)).
Command-line option names differ: their map keys and incoming names are lowercased, and short names
are expanded before lookup
([CLI map](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L1797-L1807),
[CLI lookup](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2102-L2112)).

Enum-like option values are case-insensitive in both JSON and CLI input because conversion
lowercases the supplied string before map lookup
([CLI enum conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L1845-L1846),
[JSON enum conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3826-L3841)).
Primitive values are type-checked, enum strings become numeric values, and file paths become
normalized absolute paths
([value conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3767-L3810)).

`target` accepts both `es6` and `es2015`, mapping them to the same enum value
([target map](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L558-L576)).
`module` has the same alias pair
([module map](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L590-L609)).
`moduleResolution` maps both `node10` and deprecated `node` to Node10, with `node10` listed first so
serialization uses that spelling
([resolution map](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L1063-L1079),
[reverse serialization](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2725-L2731)).

## Stored and effective values

Parsed options preserve absence; an empty `tsconfig.json` stores only config-file metadata rather
than materializing target, module, strict, or other defaults
([empty parse baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/convertCompilerOptionsFromJson/Convert%20default%20tsconfig.json%20to%20compiler-options%20with%20jsonSourceFile%20api.js#L8-L18)).

`jsconfig.json` is an explicit parser preset rather than a lazy default. Before user options are
applied, it stores `allowJs: true`, `maxNodeModuleJsDepth: 2`,
`allowSyntheticDefaultImports: true`, `skipLibCheck: true`, and `noEmit: true`
([preset](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3711-L3724),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/convertCompilerOptionsFromJson/Convert%20default%20jsconfig.json%20to%20compiler-options%20with%20jsonSourceFile%20api.js#L13-L23)).

The separate `computedOptions` registry declares dependencies and lazy computations. Exported
getters expose those effective values to compiler consumers
([registry](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L8950-L8962),
[getters](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9213-L9248)).
Consumers call the getters where effective semantics matter, including the checker and module
resolver
([checker setup](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/checker.ts#L1518-L1523),
[resolver feature checks](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L1732-L1784)).

## Computed dependency graph

| Effective option | Dependencies and computation |
| --- | --- |
| `allowImportingTsExtensions` | True when it or `rewriteRelativeImportExtensions` is truthy ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L8962-L8968)) |
| `target` | Explicit non-ES3 target; otherwise module-specific target, then ES5 ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L8969-L8980)) |
| `module` | Explicit value; otherwise ES2015 for target ES2015+, else CommonJS ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L8981-L8988)) |
| `moduleResolution` | Explicit value; otherwise selected from effective module ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L8989-L9016)) |
| `moduleDetection` | Explicit value; otherwise Force for Node16 through NodeNext modules, Auto elsewhere ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9017-L9028)) |
| `isolatedModules` | True when it or `verbatimModuleSyntax` is truthy ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9029-L9034)) |
| `esModuleInterop` | Explicit value; otherwise true for Node16/18/20/Next and Preserve ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9035-L9051)) |
| `allowSyntheticDefaultImports` | Explicit value; otherwise interop, System, or Bundler enables it ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9052-L9062)) |
| package exports/imports | Explicit value in supported modes; otherwise true in Node16, NodeNext, and Bundler ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9063-L9100)) |
| `resolveJsonModule` | Explicit value; otherwise true for Node20, NodeNext, or Bundler ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9101-L9117)) |
| `declaration` and `incremental` | Each is true when its own flag or `composite` is truthy ([declaration](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9118-L9123), [incremental](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9130-L9135)) |
| `preserveConstEnums` | True when it or effective isolated modules is true ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9124-L9129)) |
| `allowJs` | Explicit value; otherwise follows `checkJs` ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9142-L9147)) |
| `useDefineForClassFields` | Explicit value; otherwise true at effective target ES2022+ ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9148-L9155)) |
| strict-family flags | Explicit child value; otherwise follows `strict` ([source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9156-L9210)) |

With those options absent, the graph yields ES5 target, CommonJS module, Node10 resolution, disabled
interop and synthetic defaults, disabled package maps and JSON modules, disabled class-field define
semantics, and false strict-family flags
([computed graph](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L8969-L9210)).

## Important override semantics

Strict-family children can override `strict` in either direction. `strict: true` with
`strictNullChecks: false` leaves null checking off, while `strict: false` with
`strictNullChecks: true` enables that child
([strict getter](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9293-L9307)).
`--showConfig` expands `strict: true` into all nine effective children, but the expansion is
serialization rather than parsed storage
([baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/showConfig/Shows%20tsconfig%20for%20single%20option/strict/tsconfig.json#L1-L14)).

`composite: true` makes declaration and incremental compilation effective. Explicitly setting
either implication false does not negate it; validation reports that a composite project may not
disable those options
([computed values](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9118-L9135),
[validation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/program.ts#L4140-L4147)).

`verbatimModuleSyntax: true` makes effective isolation true even when `isolatedModules` is
explicitly false; that false value is not diagnosed. Effective isolation makes const enum
preservation true. `preserveConstEnums: false` cannot negate that implication and is diagnosed
([computed chain](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9029-L9034),
[const enum computation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9124-L9129),
[validation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/program.ts#L4242-L4249)).

`checkJs: true` implies effective `allowJs` only when `allowJs` is absent. Explicit
`allowJs: false` wins and makes the combination invalid
([computation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9142-L9147),
[validation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/program.ts#L4295-L4297)).

## Watch options

Watch options are stored separately and contain `watchFile`, `watchDirectory`, `fallbackPolling`,
`synchronousWatchDirectory`, `excludeDirectories`, and `excludeFiles`
([type](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/types.ts#L7564-L7573)).
Config parsing converts supplied enum strings but does not populate runtime watch defaults
([conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3737-L3757),
[empty-watch test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/tsconfigParsingWatchOptions.ts#L48-L54)).

The system watcher later defaults absent file and directory strategies to filesystem events, with
priority polling as the default event fallback; environment variables can select alternatives
([watch defaults](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/sys.ts#L1061-L1099),
[directory defaults](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/sys.ts#L1169-L1187),
[fallback default](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/watchUtilities.ts#L835-L841)).
`excludeFiles` suppresses file-watch creation and `excludeDirectories` suppresses directory-watch
creation
([watch exclusion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/watchUtilities.ts#L722-L737)).
