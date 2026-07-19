# Compiler option defaults

Source snapshot: TypeScript 4.9.5 at
[`ccf3d3c5f9b4bc2883d700870ed2dac454050f1f`](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/package.json#L1-L6).

## Representation boundary

An ordinary `tsconfig.json` starts with an empty options object and copies only supplied JSON
properties into it. Effective defaults therefore do not normally appear as own properties of the
parsed `CompilerOptions` object
([`parseOwnConfigOfJsonSourceFile`](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/src/compiler/commandLineParser.ts#L3068-L3102)).

`--showConfig` serializes properties present on the options object rather than asking every lazy
getter for its effective value
([`convertToTSConfig`](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/src/compiler/commandLineParser.ts#L2377-L2417),
[stored-option serialization](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/src/compiler/commandLineParser.ts#L2483-L2524)).
Consequently an empty config serializes as an empty `compilerOptions` object
([baseline](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/tests/baselines/reference/config/showConfig/Default%20initialized%20TSConfig/tsconfig.json#L1-L3)).

The generated `tsc --init` file is a recommendation template, not a dump of compiler defaults. It
explicitly writes ES2016, CommonJS, interop, and strict settings
([generated target and module](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/tests/baselines/reference/config/initTSConfig/Default%20initialized%20TSConfig/tsconfig.json#L13-L35),
[strict and interop](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/tests/baselines/reference/config/initTSConfig/Default%20initialized%20TSConfig/tsconfig.json#L71-L87)).

## Effective target, module, and resolution

TypeScript 4.9.5 computes these options lazily as one dependency chain
([implementation](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/src/compiler/utilities.ts#L6361-L6393)):

1. An explicit non-ES3 target wins. Explicit ES3 is treated as omitted; Node16 implies ES2022,
   NodeNext implies ESNext, and other module modes yield ES3.
2. An omitted module becomes ES2015 when the effective target is ES2015 or later; otherwise it
   becomes CommonJS.
3. An omitted module resolution becomes Node16 for Node16 modules, NodeNext for NodeNext modules,
   Node-style resolution for CommonJS, and Classic for other module kinds.

The option declaration also identifies ES3 as the default target
([`target` declaration](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/src/compiler/commandLineParser.ts#L324-L350)).
An empty configuration therefore has effective ES3, CommonJS, and Node-style resolution even
though those properties remain absent from the parsed object.

## Strict family

Each strict-family option uses its own explicit value when present and otherwise falls back to
`!!compilerOptions.strict`. With both the parent flag and child flag absent, the effective value is
false
([`getStrictOptionValue`](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/src/compiler/utilities.ts#L6460-L6473)).

## Automatic type packages

When `types` is absent, TypeScript enumerates visible packages beneath every effective type root.
An explicit `types` array bypasses that enumeration and supplies the package names directly
([`getAutomaticTypeDirectiveNames`](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/src/compiler/moduleNameResolver.ts#L502-L545)).

## Library replacement

TypeScript 4.9.5 has no `libReplacement` option. For a default library such as `dom`, the compiler
first attempts to resolve the corresponding `@typescript/lib-*` package and falls back to the
bundled library when replacement resolution fails
([library processing](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/src/compiler/program.ts#L3216-L3233)).
