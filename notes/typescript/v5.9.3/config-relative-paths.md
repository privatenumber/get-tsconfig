# Config-relative paths

Source snapshot: TypeScript 5.9.3 at
[`c63de15a992d37f0d6cec03ac7631872838602cb`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/package.json#L1-L6).

## File-path compiler options

Compiler options marked `isFilePath` are slash-normalized and converted to absolute paths while
each individual config is parsed. List elements recursively use the same conversion
([option conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3766-L3810),
[list conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3844-L3854)).

Recursive parsing changes `basePath` to the extended config's directory before converting that
config's values. An inherited relative `outDir`, `rootDir`, `rootDirs`, `typeRoots`, or similar
file-path option therefore remains anchored to the config that declared it
([extended-config parse](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3651-L3671)).

## `pathsBasePath`

`paths` is an object and is not converted like an ordinary file-path option. When a config directly
declares `paths`, TypeScript records that config's directory in `pathsBasePath`. Inherited relative
substitutions can then remain associated with their declaring config
([origin capture](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3389-L3399)).

The inheritance test keeps the substitution `"./other/*"` unchanged while recording the parent
config directory as `pathsBasePath`
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/configurationExtension.ts#L284-L295),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/configurationExtension/under%20a%20case%20sensitive%20host%20with%20jsonSourceFile%20api.js#L834-L860)).

## File specifications

`files`, `include`, and `exclude` remain string arrays during each config's own parse. During
inheritance, ordinary relative entries are prefixed with the relative path from the consuming
config directory to the declaring config directory. Rooted entries and `${configDir}` entries are
not prefixed
([list rebasing](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3424-L3443)).

A build test demonstrates this ownership: a config in one directory extends a base config in
another, and the base's relative include continues to discover files beneath the base directory
([test setup](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/tsbuild/configFileExtends.ts#L15-L39),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/tsbuild/configFileExtends/when-building-project-uses-reference-and-both-extend-config-with-include.js#L79-L99)).

## `${configDir}` purpose

A path beginning with `${configDir}` deliberately bypasses initial absolute-path conversion
([conversion guard](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3801-L3809)).
The placeholder survives recursive inheritance and is substituted only after inheritance and
API-provided option overlays have completed
([inheritance order](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3371-L3422),
[final substitution point](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3040-L3057)).

Substitution is prefix-only. String values, string lists, and `paths` substitution arrays are
copy-on-write transformed into normalized absolute paths
([substitution helpers](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3219-L3291)).

This timing creates two inheritance modes in one parent config: an ordinary relative path remains
parent-relative, while a `${configDir}` path becomes consuming-config-relative
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/configurationExtension.ts#L270-L295),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/configurationExtension/under%20a%20case%20sensitive%20host%20with%20jsonSourceFile%20api.js#L834-L864)).

## Supported configuration fields

Relevant scalar path options include `outFile`, `outDir`, `rootDir`, `tsBuildInfoFile`, `baseUrl`,
and `declarationDir`; relevant list/object options include `rootDirs`, `typeRoots`, and `paths`
([output and root declarations](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L648-L657),
[path declarations](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L731-L788),
[module-resolution paths](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L1081-L1131),
[declaration directory](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L1513-L1524)).
The eligible compiler-option registry is built from file-path options and options explicitly marked
for config-directory substitution
([registry filter](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L1684-L1690)).

Top-level `files`, `include`, and `exclude` have a separate substitution pass
([file specification substitution](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3113-L3153)).
Under `watchOptions`, `excludeDirectories` and `excludeFiles` are path lists eligible for the same
template
([watch declarations](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L324-L349)).

The inherited-watch test confirms that `${configDir}` in a base config resolves against the
consuming config directory rather than the base config directory
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/tsconfigParsingWatchOptions.ts#L100-L111),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/tsconfigParsingWatchOptions/when%20extending%20config%20file%20with%20watchOptions%20with%20jsonSourceFile%20api.js#L62-L84)).

CLI path arguments are absolutized before config parsing, so `${configDir}` supplied directly as a
CLI path is a literal path segment rather than a config template
([CLI option processing](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/executeCommandLine.ts#L633-L640),
[test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/tsc/extends.ts#L29-L34),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/tsc/extends/configDir-template-with-commandline.js#L133-L156)).
