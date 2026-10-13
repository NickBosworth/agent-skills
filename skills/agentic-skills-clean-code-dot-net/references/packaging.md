# Library delivery, trimming and Native AOT

Load applicable sections for packaged/public libraries or an existing trimmed/AOT
requirement. DNC-PACK-001 and DNC-DEPLOY-001; sources S43, S62–S64, S66. These deployment
modes are not requirements for every project. Apply delivery gates when the change
affects those contracts or repository policy requires them; do not force a new
deployment matrix onto unrelated local edits.

## API and package compatibility

MUST distinguish source compatibility (old callers compile), binary compatibility
(existing compiled callers link/run), and behavioral compatibility (promised
results, exceptions, timing and effects remain). Local references and a passing
build do not establish published API stability. Check overload/default-parameter
changes, interface additions, nullability, serialization and target-specific APIs.

For a compatibility commitment, SHOULD use existing API/assembly/package validation
against the approved released baseline. EnablePackageValidation runs SDK checks
after pack; PackageValidationBaselineVersion selects a prior package for comparison.
Confirm package identity, baseline feed/version and target matrix before restore.
Use existing local tooling; do not globally install tools without authorization.
Never update a baseline or suppress incompatibilities just to pass. Authorized
breaks require consumers, versioning and migration documentation.

MUST inspect the actual package: intended lib/ref/runtime assets, target folders,
dependencies, XML docs and required legal notices. Exclude private data, logs and
incidental files. When packaging behavior changes, test a consumer using a temporary
local feed; ProjectReference bypasses package layout. Use representative source and
already-compiled callers where those compatibility contracts change. API comparison
does not verify semantic behavior. Local pack does not authorize package publication.

## Trimming and Native AOT

First identify promised modes, targets/RIDs, dependencies and reflection/serializer
paths. MUST preserve existing commitments; do not incidentally upgrade frameworks or
declare IsTrimmable/IsAotCompatible merely to remove warnings.

EnableTrimAnalyzer investigates warnings without declaring trim compatibility.
Use the supported SDK's existing AOT analyzer configuration where applicable;
IsAotCompatible is a compatibility declaration, not proof. Review dependency warnings.
Prefer statically understandable reflection/serialization when contracts permit.
DynamicallyAccessedMembers must propagate actual member requirements;
RequiresUnreferencedCode/RequiresDynamicCode communicate limitations, not repairs.
Source generation must fit the design. Do not broadly root assemblies, silence IL
warnings or change runtime types without reviewing compatibility and size tradeoffs.

For a supported deployment, MUST use the actual publish profile/RID, inspect warnings
and run the published artifact through representative reflection, serialization and
dependency paths. A small consuming app can expose library warnings missed by
project-only analysis; supported target variants need separate evidence. A normal
build/managed test runner cannot establish published AOT behavior. Native-toolchain
prerequisites may block execution: report BLOCKED/NOT RUN and keep ordinary checks
as separate evidence.

The bundled verifier covers build/format/VSTest only. Use separate verified pack,
API comparison and publish/smoke commands. Do not claim the helper ran those gates.
No tested AOT support for this package is asserted by this guidance.
