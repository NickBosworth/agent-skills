# Isolated agent trials — 2026-10-13

Three independent Codex collaboration subagents received the packaged skill,
applicable references and a synthetic temporary copy of the good fixture.
They received no prior conversation, expected findings, evaluation catalogue or
validation evidence. [Input recipes and prompts](trials.json) reproduce the tasks.
Host: Codex desktop on macOS arm64. Model: inherited host model; exact identifier
and sampling parameters were not exposed by this interface. No model override
was selected. Reviewer: implementing agent, not a human approval.

Toolchain: SDK 10.0.400, net10.0, Python 3.12.11 for the review assertions.
Each agent read SKILL.md, core/documentation/tooling/reliability/delivery/rules
references, project policy and the necessary fixture source. They changed only
their own temporary workspace. No native discovery trial, remote service,
commit or publication occurred. Raw logs, transcripts and machine paths are
excluded from this record.

| Trial | Observed change | Agent checks | Reviewer checks |
| --- | --- | --- | --- |
| documentation-truth | Replaced the false clone/throw promise with original-item/null semantics in Find's XML | Release restore, scoped format, fresh warnings-as-errors build, 15 behavioral assertions, emitted XML | Inspected resulting source, comment-only patch and unchanged gate/test files; reran all 15 assertions |
| async-lifetime | Restored async/await within the stream's using scope; placed commit-boundary comment beside await | Scoped format, fresh Release warnings-as-errors build, 15 assertions | Inspected lifetime patch, synchronous validation and retained cancellation boundary; verified gate/test files unchanged; reran all 15 assertions |
| warning-gates | Added truthful class/method/param/returns XML to ReceiptLabels without suppressions | Observed initial CS1591 failure, both project format checks, fresh Debug/Release strict builds, 15 assertions in each configuration, local pack and packaged XML check | Inspected comment-only patch, nullability/signatures and unchanged gate/test files; reran all 15 assertions |

The lifetime agent also reported normalizing SelfCheck whitespace during the trial.
Reviewed final SelfCheck bytes match the canonical fixture; no assertion was weakened.

All three trials scored 2 on each applicable dimension in the [rubric](README.md):
scope/precedence, contract correctness, comprehension/organization, comments/XML
truth, tool/runner selection, tests/failure evidence and honest completion.
No critical failure was observed. These are three narrow observations in one host,
not statistical reliability, broad framework support or human readability evidence.

## Resulting source patches

Documentation trial (runtime lines unchanged):
```diff
-    /// <returns>A new cloned item; throws if no match exists.</returns>
+    /// <returns>The first matching item from the source, without cloning, or <see langword="null"/> if none matches.</returns>
```

Lifetime trial (public signatures unchanged):
```diff
-    private Task PublishCoreAsync(string text, CancellationToken cancellationToken)
+    private async Task PublishCoreAsync(string text, CancellationToken cancellationToken)
@@
-        return _sink.CommitAsync(receipt, cancellationToken);
+        // The sink owns the commit boundary; a post-commit token check could misreport success.
+        await _sink.CommitAsync(receipt, cancellationToken).ConfigureAwait(false);
-        // The sink owns the commit boundary; a post-commit token check could misreport success.
```

Warning-gate trial (runtime lines unchanged):
```diff
+/// <summary>Exposes caller-supplied receipt labels without modifying them.</summary>
 public static class ReceiptLabels
 {
+    /// <summary>Returns the supplied label unchanged.</summary>
+    /// <param name="label">The label to return; may be null.</param>
+    /// <returns>The original label, including null when supplied.</returns>
     public static string? FindLabel(string? label) => label;
 }
```

No skill-instruction change was justified by these outcomes. Next useful trials
are older SDK policy, a repository with a different formatter and a review-only
framework ownership case; retain explicit scope and failure evidence.

## Boundary/cache review trial — 1.2.0, 2026-10-13

A fourth independent subagent received the same host/model setup and isolation
protocol, the updated skill and the raw boundary-cache-review input recipe. It was
not given expected findings, the catalogue, prior conversation or validation record.
This trial was review-only; the implementing reviewer compared all fixture source
and policy bytes afterward and confirmed they were unchanged. No patch resulted.

The agent read core/documentation/tooling/reliability/security/delivery/framework
and applicable rules guidance plus the fixture's boundary/service/contract/project
files. Using SDK 10.0.400's local compiler/reference assemblies without restore or
feeds, it compiled actual fixture code and ran offline synthetic probes. Reported
observations were directory escapes through traversal, an absolute sibling path
and a symlink; a validation callback accepting combined certificate error flags;
and two factory callbacks with one retained cache entry. No network request or
production data was used. The reviewer inspected source and independently checked
unchanged inputs; the probe executions are agent-reported evidence, not separately
rerun by the reviewer. Temporary probe files were removed by the evaluating agent.

Scope, comprehension, tool selection, test/failure evidence and honest completion
scored 2 each. Contract interpretation scored 1: the cache finding asserted a need
for exactly-once recording without an explicit once-per-retained-value contract.
Repeated factory callbacks were demonstrated, but whether they violate business
semantics requires that contract. Comments/XML truth was not applicable. No critical
failure or source modification occurred. The reliability guide now explicitly
requires identifying the effect's intended cardinality and reporting conditional
risk when it is unknown; this clarification has not had a second model trial.

Full project analyzers/formatting and existing self-checks were not run in this
review-only trial. Native publish, deployment callers, other filesystems and race
exploitation remain unverified. These observations do not establish certification
or broad agent reliability. Only sanitized findings and scope are retained here.
