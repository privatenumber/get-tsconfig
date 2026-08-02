# Wildcard matching

Source snapshot: TypeScript 5.9.3 at
[`c63de15a992d37f0d6cec03ac7631872838602cb`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/package.json#L1-L6).

TypeScript implements its own path-component-to-regular-expression conversion; config patterns are
not general minimatch patterns
([wildcard conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9630-L9713)).

## Operators

`*` matches within one path component and never crosses `/`. `?` matches one non-slash character
([single-component fragments](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9712-L9714),
[question-mark test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L410-L419)).
Only a complete component equal to `**` receives recursive-directory behavior
([recursive component](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9653-L9657)).

Characters other than `*` and `?` pass through the reserved-character escape table. Bracket
classes and brace expansion are therefore literals, not additional wildcard syntax
([escape table](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9527-L9538),
[component conversion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9682-L9697)).

Include-file regular expressions match the complete path. Exclude expressions may terminate at the
end of a path or at a directory separator, allowing a directory exclusion to prune its subtree
([terminators](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9592-L9602)).

## Implicit directory patterns

An include whose final component contains none of `.`, `*`, or `?` is treated as a directory
pattern
([implicit-pattern test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9614-L9622)).
TypeScript appends recursive and file wildcards, so `src` behaves as `src/**/*` without first
checking that `src` is a directory
([expansion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9637-L9651)).
A final component containing a dot, such as `src.test`, is not implicitly expanded
([predicate](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9614-L9622)).

## Invalid specifications

An include may not end in `**` or `**/`; TypeScript diagnoses and removes that specification. A
trailing recursive component is allowed in `exclude`
([validation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3860-L3867),
[diagnostic filtering](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L4050-L4073),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/matchFiles/in%20includes%20with%20trailing%20recursive%20directory%20with%20json%20api.js#L96-L100)).

A `..` component after recursive `**` is invalid in either include or exclude and produces TS5065
([validation](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L4006-L4017),
[tests](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L795-L844)).
Multiple recursive components are otherwise accepted, including `**/x/**/*`
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L769-L779)).

## Package directories

Wildcard matching recognizes exactly `node_modules`, `bower_components`, and `jspm_packages` as
common package directories
([directory list](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9541-L9545)).
A negative lookahead inserted into wildcard components and recursive traversal excludes these
directories independently of the user-visible `exclude` list
([fragments](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9554-L9567),
[component insertion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9684-L9694)).

`exclude: []` therefore does not make a generic wildcard enter package directories
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L516-L526),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/matchFiles/and%20empty%20exclude%20with%20json%20api.js#L34-L43)).
Naming a package component explicitly, as in `**/node_modules/a.ts`, allows that component to
match
([explicit component test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L527-L537)).
Entirely literal include entries beneath package directories also work because no wildcard
component receives the negative lookahead
([literal tests](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L330-L375)).

## Hidden paths

In include matching, a leading `*` or `?` cannot match a component beginning with `.`, and `**`
does not implicitly traverse dot-prefixed directories
([single-star restriction](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9562-L9567),
[recursive restriction](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9668-L9679)).
The default config consequently omits dotted files and folders
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/tsconfigParsing.ts#L157-L162),
[baseline](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/tests/baselines/reference/config/tsconfigParsing/ignore%20dotted%20files%20and%20folders%20with%20json%20api.js#L18-L20)).

Hidden paths can be selected through literal `files`, literal includes, or patterns containing an
explicit dot-prefixed component
([literal files](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/tsconfigParsing.ts#L164-L171),
[wildcard tests](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L916-L948)).
Exclude wildcards use a broader fragment without the include-side leading-dot restriction
([exclude fragment](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9580-L9584)).

## `.min.js`

The include-side single-star fragment deliberately avoids matching a final `.min.js` suffix
([fragment](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9554-L9561)).
With JavaScript enabled, `js/*` therefore discovers ordinary JavaScript files but omits minified
files
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L573-L585)).

An explicit suffix such as `js/*.min.js` includes minified files because `.min.js` is represented
literally rather than consumed by the terminal star
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L586-L598)).
Exclude wildcards have no `.min.js` exception
([test](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/testRunner/unittests/config/matchFiles.ts#L727-L742)).
An explicit `files` entry bypasses wildcard matching entirely
([literal insertion](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3926-L3932)).

## Traversal and case sensitivity

`matchFiles` filters each file by supported extension, then exclusion, then the first matching
include expression. It prunes directory traversal when include-directory or exclude expressions
reject a directory
([traversal](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9783-L9820)).
It tracks canonical real paths to avoid revisiting a directory through recursive symlink cycles
([visited paths](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9783-L9787)).

Matching and deduplication follow `host.useCaseSensitiveFileNames`, which controls both canonical
keys and the regular-expression `i` flag
([canonical keys](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/commandLineParser.ts#L3901-L3908),
[regex flags](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/utilities.ts#L9752-L9755)).
