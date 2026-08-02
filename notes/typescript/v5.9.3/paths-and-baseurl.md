# `paths` and `baseUrl`

Source snapshot: TypeScript 5.9.3 at
[`c63de15a992d37f0d6cec03ac7631872838602cb`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/package.json#L1-L6).

## Eligible specifiers

Optional resolution attempts `paths` before `baseUrl`. `paths` is considered when the option exists
and `pathIsRelative(moduleName)` is false. That predicate recognizes `.`, `..`, `./...`, and
`../...`, so dot-relative specifiers bypass path mappings
([resolution order](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L1550-L1574),
[relative predicate](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/path.ts#L95-L102)).

The later `baseUrl` check uses the broader `isExternalModuleNameRelative` predicate, which treats
both dot-relative names and rooted disk paths as relative. A rooted specifier can therefore match a
`paths` key but cannot fall through to `baseUrl`
([baseUrl guard](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L1550-L1559),
[external-name predicate](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilitiesPublic.ts#L296-L300),
[rooted mapping case](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/cases/compiler/pathMappingBasedModuleResolution_rootImport_aliasWithRoot.ts#L10-L24)).

## Base path without `baseUrl`

`paths` does not require `baseUrl`. `getPathsBasePath` uses explicit `baseUrl` when present,
otherwise internal `pathsBasePath`, and finally the resolution host's current directory as an API
fallback
([base selection](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L6533-L6540)).

When a config directly declares `paths`, parsing records that config's directory in
`pathsBasePath`, preserving the origin of relative substitutions through inheritance
([origin capture](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3389-L3399)).
Tests verify direct mappings anchored at the current config and inherited mappings anchored at the
base config
([direct case](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/cases/compiler/pathMappingWithoutBaseUrl1.ts#L3-L17),
[inherited case](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/cases/compiler/pathMappingWithoutBaseUrl2.ts#L3-L24)).

An inherited explicit `baseUrl` takes precedence over the directory that declares a local `paths`
object
([base precedence](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L6538-L6540),
[case](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/cases/compiler/pathMappingInheritedBaseUrl.ts#L3-L25)).

## Validation and parsing

Each key may contain at most one `*`. Each value must be a nonempty array of strings, and each
substitution may contain at most one `*`. Without `baseUrl`, substitution values must be relative
or absolute; this restriction applies to values, not alias keys
([validation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/program.ts#L4173-L4204),
[relative-path predicate](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/path.ts#L91-L102)).

The validation baselines cover non-array values, non-string entries, empty arrays, multiple stars,
and bare substitutions without `baseUrl`
([non-array](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/pathsValidation1.errors.txt#L1-L15),
[non-string](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/pathsValidation2.errors.txt#L1-L15),
[empty](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/pathsValidation3.errors.txt#L1-L16),
[stars](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/pathsValidation4.errors.txt#L1-L25),
[missing baseUrl](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/pathsValidation5.errors.txt#L1-L19)).

Parsing separates exact strings from wildcard patterns and caches the parsed result by identity of
the `paths` object. Invalid multi-star keys are omitted after diagnostics have been produced
([pattern cache and parse](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L10133-L10198)).

## Key selection

Exact-key lookup runs before wildcard lookup regardless of declaration order. Once an exact key
matches, no wildcard key is considered, even if every exact-key substitution later fails
([exact lookup](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L10253-L10271),
[resolver use](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L3159-L3168)).

A wildcard is represented as prefix and suffix. Matching is case-sensitive, requires both strings,
and allows an empty capture
([pattern representation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/core.ts#L2380-L2402),
[match predicate](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/core.ts#L2428-L2448)).

Among matching wildcards, only prefix length determines specificity. Equal-prefix ties retain the
first key encountered because replacement occurs only for a strictly longer prefix
([best-match algorithm](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/core.ts#L2410-L2424),
[object-key order](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/core.ts#L1282-L1291)).
The specificity test verifies that `components/*` wins over `*`
([case](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/cases/compiler/pathMappingBasedModuleResolution5_node.ts#L5-L24),
[trace](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/pathMappingBasedModuleResolution5_node.trace.json#L22-L36)).

## Substitution order

For a wildcard key, TypeScript extracts the text between prefix and suffix, replaces the first star
in each substitution, and normalizes the substitution against the selected base directory. A rooted
substitution replaces the base rather than being appended
([capture and substitution](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L3162-L3172),
[path combination](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/path.ts#L568-L592)).

Substitutions are tried in array order and stop at the first successful loader result
([substitution loop](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L3167-L3184),
[`forEach`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/core.ts#L26-L42)).
Prefix-and-suffix wildcard keys and substitutions are supported
([case](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/cases/compiler/pathMappingBasedModuleResolution8_node.ts#L5-L21),
[trace](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/pathMappingBasedModuleResolution8_node.trace.json#L1-L9)).

The implementation replaces a star only when `matchedStar` is truthy. Because an empty wildcard
capture is permitted, an empty capture leaves the substitution's star unchanged. Exact-key matches
also have no captured star and leave a star in their substitutions unchanged
([replacement guard](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L3160-L3169),
[empty capture](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/core.ts#L2445-L2448)).

## Fallback boundaries

When no key matches, path resolution returns ordinary `undefined`; optional resolution then tries a
single `baseUrl` candidate formed from the original module name
([optional-resolution flow](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L1550-L1574),
[baseUrl candidate](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L1651-L1663)).

A matched key whose substitutions all fail returns `{ value: undefined }`, meaning that this
optional-settings search must stop. TypeScript does not then try the separate `baseUrl` candidate;
the outer resolver may continue to package imports, self-name, `node_modules`, or ordinary relative
resolution
([matched-key return](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L3159-L3186),
[`SearchResult` contract](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L3390-L3405),
[outer Node resolver](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L1905-L1948)).
The failed-star trace proceeds directly to `node_modules` after both substitutions fail
([trace](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/pathMappingBasedModuleResolution5_node.trace.json#L37-L60)).

## Candidate generation versus file resolution

`paths` selects one key and generates candidate locations, then delegates each candidate to a
resolution-kind-specific loader. It does not itself define extension, package, directory, or index
lookup
([delegation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L3159-L3184)).

Node-style resolution injects `nodeLoadModuleByRelativeName`. Non-ESM mode tries a file and then a
directory with package/index behavior; ESM mode omits directory lookup
([Node loader selection](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L1905-L1909),
[Node loader](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L1978-L2014)).
Classic resolution injects its file/extension loader instead of Node's folder/package logic
([Classic resolver](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L3273-L3317)).

When a substitution has a recognized extension, TypeScript first probes the exact candidate. If
that fails, it still passes the candidate to the normal loader
([exact-extension branch](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/moduleNameResolver.ts#L3174-L3182),
[failed exact lookup trace](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/pathMappingBasedModuleResolution_withExtension_failedLookup.trace.json#L2-L24)).
