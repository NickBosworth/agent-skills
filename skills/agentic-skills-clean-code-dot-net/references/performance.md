# Measure the performance contract

Load when a requirement or observed regression makes measurement necessary.
Sources: [diagnostic tools](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/),
[BenchmarkDotNet good practices](https://benchmarkdotnet.org/articles/guides/good-practices.html),
[comparative benchmark workflow](https://github.com/dotnet/skills/blob/main/plugins/dotnet-diag/skills/microbenchmarking/SKILL.md).

| Question | Appropriate evidence |
| --- | --- |
| Where does application time/allocation go? | Representative profiling or tracing with the existing tools. |
| Which local implementation is faster or allocates less? | A comparative microbenchmark with equivalent observable work. |
| Does the service meet latency/throughput under contention? | Representative load tests; a microbenchmark cannot establish service capacity. |

Record the requirement, baseline and candidate revision, runtime, configuration,
hardware, inputs and measurement method. Compare equivalent results and realistic
input sizes, including important empty/boundary cases. Measure allocations when
they constrain the change. Keep setup, I/O and lazy enumeration in the measured
region only when they belong to the actual operation being compared.

Use optimized builds and the established benchmark runner. A compilation/dry
smoke run is correctness evidence, not a timing result. Retain repeated samples
and uncertainty; do not assert improvement from a single stopwatch observation.
Forward runner arguments and select benchmarks explicitly for unattended runs.
Estimate method × parameter combination × job count before execution; bound
investigation cost rather than blindly multiplying cases.

Use the existing benchmark suite for maintained regression coverage. A temporary
investigation belongs in an owned disposable workspace unless retaining it has a
clear maintenance purpose. Do not add BenchmarkDotNet, Span/struct/pooling rewrites
or a permanent performance gate merely because this guide exists. Preserve
ownership, nullability, ordering and representation contracts in every variant.
