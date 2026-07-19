# Root-file selection

Source snapshot: TypeScript 5.9.3 at
[`c63de15a992d37f0d6cec03ac7631872838602cb`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/package.json#L1-L6).

"Root files" here means the `ParsedCommandLine.fileNames` produced while parsing a config. The
program processes those names as roots; imports and references can add further files later
([config result](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3053-L3072),
[`processRootFile`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/program.ts#L1780-L1786)).

## Selection pipeline

After parsing inheritance and effective file specifications, TypeScript passes the specs to
`getFileNamesFromConfigSpecs`
([config worker](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3025-L3063)).
Relative `files`, `include`, and `exclude` entries are based on the directory containing the config
file
([base path](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3053-L3056)).

The selector maintains separate maps for literal `files`, wildcard-discovered source files, and
wildcard-discovered JSON files. It returns them in that order
([map setup](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3903-L3919),
[return order](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3977-L3980)).

A nonempty validated `include` triggers `host.readDirectory` with the supported extensions,
exclusions, and inclusions. The normal system host delegates to `matchFiles` with host case
sensitivity
([directory scan](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3921-L3937),
[system host](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/sys.ts#L1881-L1884)).

## Defaults and empty arrays

The default include is exactly `**/*`, installed when both parsed `files` and `include`
specifications are undefined. A valid array, including `[]`, suppresses it; absent, `null`, or an
invalid non-array value does not
([default declaration](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3013-L3015),
[default selection](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3075-L3112)).

`files: []` produces no literal roots and emits TS18002 when there are no project references and
the config does not itself use `extends`
([diagnostic condition](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3077-L3092),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/tsconfigParsing/generates%20errors%20for%20empty%20files%20list%20with%20json%20api.js#L11-L15)).
A nonempty `references` array makes an empty `files` array valid for a solution config; an empty
references array does not
([condition and tests](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/tsconfigParsing.ts#L271-L298)).

`include: []` contributes no roots. TS18003 is emitted only when the raw config has neither an own
`files` nor `references` property; even empty or `null` properties suppress it. `files: []` may
instead emit TS18002
([empty include handling](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3109-L3112),
[no-input diagnostic](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3156-L3161)).

`exclude: []` is a valid explicit list. Because the property exists, output-directory exclusions
are not synthesized, and the empty list does not otherwise suppress inclusion
([exclude selection](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3097-L3107)).

## Literal and wildcard roots

`files` and `include` are additive. Literal roots are inserted first, then existing filesystem
entries matched by `include` are added
([literal insertion and scan](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3926-L3937),
[return order](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3977-L3980)).

Literal `files` entries are normalized to absolute paths and inserted without checking existence or
supported extension. `include` is discovery-based and contributes only existing supported files
([literal insertion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3926-L3932),
[missing-file tests](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L204-L214),
[literal-looking include](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L254-L264)).
`createProgram` later rejects unsupported literal roots unless `allowNonTsExtensions` is enabled;
JavaScript roots receive the specific suggestion to enable `allowJs`
([program validation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/program.ts#L3461-L3479)).

`exclude` applies only to directory scanning and cannot remove a literal root
([scan boundary](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3926-L3928),
[test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L462-L477),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/matchFiles/always%20include%20literal%20files%20with%20json%20api.js#L84-L107)).

Literal and wildcard maps use canonical path keys. Repeated literals collapse, and a wildcard match
already present as a literal is discarded
([canonical keys](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3903-L3908),
[wildcard duplicate check](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3945-L3949)).

## Supported extensions

Without effective `allowJs`, wildcard discovery uses these priority groups
([extension groups](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9903-L9912)):

- `.ts`, `.tsx`, `.d.ts`
- `.cts`, `.d.cts`
- `.mts`, `.d.mts`

With effective `allowJs`, JavaScript extensions are appended to their corresponding groups:
`.js`/`.jsx`, `.cjs`, and `.mjs`
([JavaScript extension groups](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9912-L9936)).
Effective `allowJs` is the explicit value when present and otherwise follows `checkJs`
([computation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9142-L9147)).

`jsx` does not control whether `.tsx` is discovered, and `.jsx` follows `allowJs` rather than the
selected JSX emit mode
([tests](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L663-L726)).

`resolveJsonModule` adds `.json` to directory discovery, but a JSON file is retained only when it
matches an include specification ending in `.json`. JSON wildcard roots are kept in a separate map
and returned after source wildcard roots
([JSON extension selection](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9946-L9956),
[JSON filtering](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3935-L3952),
[return order](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3977-L3980)).

## Default output exclusions

When `exclude` is absent or `null`, TypeScript synthesizes exclusions from effective `outDir` and
`declarationDir`. Any non-null own value suppresses synthesis; `[]` supplies no exclusions
([synthesis](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3097-L3107)).

Tests show `outDir` and `declarationDir` being excluded only while the top-level property is absent
([outDir test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/tsconfigParsing.ts#L173-L191),
[declarationDir test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/tsconfigParsing.ts#L193-L212)).
These defaults still cannot remove a path explicitly named in `files`
([literal insertion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3926-L3932)).

## Ordering and extension priority

Wildcard-discovered results are grouped by include-array order. Files and directories within each
traversed directory are sorted with a case-sensitive comparator for deterministic enumeration
([sorting](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9772-L9781),
[traversal order](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9788-L9819)).

Wildcard candidates are removed when a higher-priority extension with the same basename exists.
Extension priority makes which same-basename extension survives independent of encounter order,
but overall ordering still follows include order
([priority check](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3954-L3968),
[removal algorithm](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L4175-L4219)).

There is a legacy exception: `.d.ts` does not suppress a same-basename `.js` or `.jsx`, while `.ts`
and `.tsx` do suppress lower-priority JavaScript counterparts
([priority exception](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L4180-L4195)).
Priority removal affects wildcard roots only; lower-priority paths supplied through `files` remain
([literal boundary](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L4208-L4219)).
