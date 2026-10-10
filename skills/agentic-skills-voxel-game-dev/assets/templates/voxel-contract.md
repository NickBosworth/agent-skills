# Voxel contract: <subsystem>

Fill relevant sections. Mark decisions as observed, agreed, or provisional. Link source code and established architecture records.

## Coordinates/topology

- Units, voxel size, origin, axes, handedness:
- Integer range/floating-origin policy:
- Cell extents/centers, sample positions, ownership:
- Chunk dimensions, floor division, local range, storage order:
- Scalar sign, isovalue, equality, interpolation, gradient stencil:
- Unknown/unloaded/out-of-world behavior:

## Channels/identity

| Channel/content | Authoritative owner | Data type/stable ID | Persistence | Revision source |
| --- | --- | --- | --- | --- |
| | | | | |

## Derived outputs

| Output | Input channels | Halo/stencil | Configuration dependencies | Publication path/thread | Completion event |
| --- | --- | --- | --- | --- | --- |
| Mesh | | | | | |
| Collision | | | | | |
| Lighting | | | | | |
| Navigation | | | | | |

## Edits/asynchronous work

- Validation, atomicity, ordering:
- World/session identity, chunk lifetime token:
- Job revision vector including neighbors/configuration:
- Load/unload, cancellation, stale results:
- Queue limits, priorities, deduplication, backpressure:
- Snapshot/lock ownership and disposal:
- Player behavior while outputs lag:

## Persistence/networking if needed

- Save schema, generator/config/content versions:
- Snapshot/delta/log and compaction policy:
- Durability, acknowledgement, integrity, recovery:
- Migrations and unknown IDs/versions:
- Authority, replay handling, snapshot/edit ordering:

## Verification

- Negative positions and exact boundaries:
- Edge/corner dependencies:
- Neighbor replacement/stale-job scenario:
- Restart/old-save scenario:
- Test/build commands and fixtures:
