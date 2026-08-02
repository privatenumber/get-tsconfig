# pnpm installation internals

These notes describe pnpm behavior that affects configuration-package resolution. The current
scope is the isolated `node_modules` linker, virtual-store package locations, and dependency
symlinks.

Every behavioral claim links inline to pnpm source or tests at an exact release commit. A snapshot
directory covers only the topics its README marks as audited. Missing notes do not imply that
behavior is unchanged.

## Snapshots

| Snapshot | Source commit | Coverage |
| --- | --- | --- |
| [10.19.0](./v10.19.0/) | [`43d7b18c2fe0c91312407241f50a1f2e7364718f`](https://github.com/pnpm/pnpm/blob/43d7b18c2fe0c91312407241f50a1f2e7364718f/pnpm/package.json#L1-L5) | Focused isolated-linker snapshot |

## Topics

| Topic | 10.19.0 |
| --- | --- |
| Virtual-store package locations and dependency symlinks | [Audited](./v10.19.0/symlinked-node-modules-layout.md) |

## Snapshot policy

- Directories use exact released versions because installation behavior can change within a major
  version.
- Behavioral claims use full commit permalinks to pnpm source or tests.
- A snapshot covers only the topics listed in its README.
- Local experiments supplement upstream evidence; they do not replace it.
