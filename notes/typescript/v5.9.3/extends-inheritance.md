# `extends` inheritance

Source snapshot: TypeScript 5.9.3 at
[`c63de15a992d37f0d6cec03ac7631872838602cb`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/package.json#L1-L6).

## Graph traversal and circularity

Each config is identified for circularity by its normalized absolute config filename. Encountering
a path already present in the current `resolutionStack` emits TS18000 with the complete path chain
and returns an unsuccessful parse result that still retains raw config data
([cycle check](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3371-L3387)).

The stack is copied with `concat` before traversing parents. Sibling branches of a multiple-extends
or diamond graph therefore have independent ancestry; a common ancestor is not itself a cycle
([branch stack](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3400-L3409)).

A detected cycle does not erase the root config's own options. The circular-config test reports
TS18000 while retaining the root's `module: amd`
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/configurationExtension.ts#L145-L156),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/configurationExtension/under%20a%20case%20sensitive%20host%20with%20jsonSourceFile%20api.js#L483-L497)).

## Compiler option precedence

Parents in an `extends` array are applied left to right. Each parent's own compiler options are
shallow-assigned into the accumulating result, so later parents replace colliding properties from
earlier parents. The child's own options are assigned after every parent and therefore win over all
parents
([parent loop](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3400-L3421),
[option merge](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3424-L3450),
[`assign`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/core.ts#L1349-L1360)).

The four-parent test demonstrates both carry-forward and replacement: distinct keys survive while
later parents replace earlier `noImplicitAny`, `strictNullChecks`, and `module` values
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/configurationExtension.ts#L216-L248),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/configurationExtension/under%20a%20case%20sensitive%20host%20with%20jsonSourceFile%20api.js#L750-L762)).

A compiler option set to `null` converts to an own property with value `undefined`. That own
property overwrites an inherited value, allowing the child to clear an inherited option
([null conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L2572-L2583),
[JSON option conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3741-L3757),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/configurationExtension/under%20a%20case%20sensitive%20host%20with%20jsonSourceFile%20api.js#L597-L608)).

## `files`, `include`, and `exclude`

These arrays are selected as complete values rather than concatenated. An own array, including
`[]`, prevents inheritance. Otherwise each parent's array replaces the previous parent's array, so
the last applicable parent wins
([list inheritance](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3424-L3443)).

The three properties are independent. `files: []` clears inherited `files` without clearing a
separately inherited or local `include`
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/configurationExtension.ts#L193-L205),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/configurationExtension/under%20a%20case%20sensitive%20host%20with%20jsonSourceFile%20api.js#L627-L639)).

A top-level `null` list is treated as absent rather than as an empty-array override
([list extraction](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3185-L3208),
[inheritance selection](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3429-L3443)).

## Watch options

Watch options merge property by property. Later parents replace earlier parent properties, and the
child replaces inherited properties. Copy-on-write avoids mutating an inherited watch-options
object before a collision requires a merge
([parent merge](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3417-L3420),
[child merge](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3447-L3459)).

The watch-options test shows a child `watchFile` replacing the parent's value while the distinct
parent `watchDirectory` remains inherited
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/tsconfigParsingWatchOptions.ts#L70-L112),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/tsconfigParsingWatchOptions/when%20extending%20config%20file%20with%20watchOptions%20with%20jsonSourceFile%20api.js#L13-L55)).

## Project references

`references` are absent from `ExtendsResult`; the inherited result includes compiler options, watch
options, file specifications, `compileOnSave`, and source metadata, but not project references
([`ExtendsResult`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3357-L3366),
[merge loop](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3400-L3421)).

Final project references are read only from the consuming config's `raw.references`. Valid paths
become absolute relative to that config directory while `originalPath`, `prepend`, and `circular`
are retained
([reference conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3164-L3183)).
