# TypeScript configuration internals

These notes describe TypeScript compiler and language-service behavior. The scope is limited to
configuration discovery, parsing, inheritance, option computation, root-file selection, and module
resolution.

Every behavioral claim links inline to TypeScript source or tests at an exact release commit. A
snapshot directory covers only the topics its README marks as audited. Missing notes do not imply
that behavior is unchanged.

## Snapshots

| Snapshot | Source commit | Coverage |
| --- | --- | --- |
| [4.9.5](./v4.9.5/) | [`ccf3d3c5f9b4bc2883d700870ed2dac454050f1f`](https://github.com/microsoft/TypeScript/blob/ccf3d3c5f9b4bc2883d700870ed2dac454050f1f/package.json#L1-L6) | Sparse historical snapshot |
| [5.9.3](./v5.9.3/) | [`c63de15a992d37f0d6cec03ac7631872838602cb`](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/package.json#L1-L6) | Full baseline |
| [6.0.3](./v6.0.3/) | [`050880ce59e30b356b686bd3144efe24f875ebc8`](https://github.com/microsoft/TypeScript/blob/050880ce59e30b356b686bd3144efe24f875ebc8/package.json#L1-L7) | Sparse current snapshot |

## Topics

| Topic | 4.9.5 | 5.9.3 | 6.0.3 |
| --- | --- | --- | --- |
| Configuration pipeline and representations | Not audited | [Baseline](./v5.9.3/configuration-pipeline.md) | [Reverified](./v6.0.3/#configuration-pipeline) |
| JSONC parsing and diagnostics | Not audited | [Baseline](./v5.9.3/jsonc-parsing-and-diagnostics.md) | [Reverified](./v6.0.3/#jsonc-and-diagnostics) |
| Configuration discovery | Not audited | [Baseline](./v5.9.3/configuration-discovery.md) | [Replacement](./v6.0.3/configuration-discovery.md) |
| `extends` target resolution | Not audited | [Baseline](./v5.9.3/extends-resolution.md) | [Reverified with isolated changes](./v6.0.3/#extends-target-resolution) |
| `extends` inheritance | Not audited | [Baseline](./v5.9.3/extends-inheritance.md) | [Reverified](./v6.0.3/#extends-inheritance) |
| Config-relative paths and `${configDir}` | Not audited | [Baseline](./v5.9.3/config-relative-paths.md) | [Reverified with a default change](./v6.0.3/#config-relative-paths) |
| Compiler option values | [Defaults](./v4.9.5/compiler-option-defaults.md) | [Baseline](./v5.9.3/compiler-option-values.md) | [Defaults](./v6.0.3/compiler-option-defaults.md) |
| Root-file selection | Not audited | [Baseline](./v5.9.3/root-file-selection.md) | [Reverified with default changes](./v6.0.3/#root-file-selection) |
| Wildcard matching | Not audited | [Baseline](./v5.9.3/wildcard-matching.md) | [Reverified](./v6.0.3/#wildcard-matching) |
| `paths` and `baseUrl` resolution | Not audited | [Baseline](./v5.9.3/paths-and-baseurl.md) | [Reverified with resolver default changes](./v6.0.3/#paths-and-baseurl) |

## Snapshot policy

- Directories use exact released versions because behavior can change within a major version.
- Older snapshots remain immutable except for factual or citation corrections.
- A materially changed algorithm receives a complete replacement note. An isolated change may be
  recorded in the newer snapshot README when the earlier note has been reverified and remains an
  accurate description of the surrounding algorithm.
- An unchanged topic may link to an earlier note only after the newer release has been re-audited;
  the newer snapshot README must carry source links supporting that conclusion.
- A new full baseline is created when sparse replacements become harder to navigate than a fresh
  corpus.
- Mutable branch links and abbreviated commit links are not acceptable evidence.

## Updating the corpus

1. Select an exact TypeScript release and record its full commit SHA.
2. Diff the source functions and tests cited by the previous snapshot.
3. Re-run the behavior through the relevant compiler API, CLI baseline, or language-service test.
4. Add complete notes for changed topics and release-pinned evidence for unchanged topics.
5. Add the snapshot to the topic matrix without rewriting older snapshots.
